const crypto = require("node:crypto");
const asyncHandler = require("express-async-handler");
const prisma = require("../prismaClient");
const { reqUserDbId, resolveTokenRole } = require("../utils/userAuthorization");
const { getActingClientId } = require("../utils/actingClientScope");
const { notifyNcUser } = require("../services/ncNotificationService");

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  clientId: true,
};
const PRIORITIES = new Set(["low", "medium", "high", "critical"]);
const STATUSES = new Set([
  "assigned",
  "draft",
  "response_submitted",
  "under_review",
  "reopened",
  "closed",
]);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseDate(value, label) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw httpError(400, `${label} must be a valid date.`);
  }
  return date;
}

function ncNumber() {
  const year = new Date().getUTCFullYear();
  return `NC-${year}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

async function authContext(req) {
  const userId = reqUserDbId(req);
  if (!userId) throw httpError(401, "Not authenticated");
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw httpError(401, "Not authenticated");
  return user;
}

function accessWhere(req, user) {
  const role = resolveTokenRole(req.user);
  if (role === "superadmin") {
    const actingClientId = getActingClientId(req);
    return actingClientId ? { clientId: actingClientId } : {};
  }
  if (role === "company_admin") return { clientId: user.clientId };
  return { OR: [{ assigneeId: user.id }, { reporterId: user.id }] };
}

async function findVisibleNc(req, user, include = {}) {
  const row = await prisma.nonconformance.findFirst({
    where: { id: req.params.id, ...accessWhere(req, user) },
    include,
  });
  if (!row) throw httpError(404, "Nonconformance not found.");
  return row;
}

async function safeNotify(payload) {
  try {
    return await notifyNcUser(payload);
  } catch (err) {
    console.error("NC notification failed after workflow transition:", err);
    return null;
  }
}

const DETAIL_INCLUDE = {
  reporter: { select: USER_SELECT },
  assignee: { select: USER_SELECT },
  sourceFormResponse: {
    select: {
      id: true,
      answers: true,
      category: true,
      createdAt: true,
    },
  },
  responses: {
    orderBy: { version: "desc" },
    include: {
      submittedBy: { select: USER_SELECT },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  },
  history: {
    orderBy: { createdAt: "desc" },
    include: { actor: { select: USER_SELECT } },
  },
};

exports.create = asyncHandler(async (req, res) => {
  const reporter = await authContext(req);
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const category = String(req.body?.category || "General").trim();
  const priority = String(req.body?.priority || "medium").trim().toLowerCase();
  const assigneeId = String(req.body?.assigneeId || "").trim();
  const dueDate = parseDate(req.body?.dueDate, "Due date");

  if (!title || !description || !assigneeId) {
    throw httpError(400, "Title, description, assignee, and due date are required.");
  }
  if (!PRIORITIES.has(priority)) throw httpError(400, "Invalid priority.");

  const assignee = await prisma.user.findFirst({
    where: {
      id: assigneeId,
      clientId: reporter.clientId,
      active: true,
      accessMode: { not: "view_only" },
    },
    select: USER_SELECT,
  });
  if (!assignee) throw httpError(400, "Assignee must be an active user in your company.");

  const sourceFormResponseId = String(req.body?.sourceFormResponseId || "").trim() || null;
  if (sourceFormResponseId) {
    const source = await prisma.formResponse.findFirst({
      where: { id: sourceFormResponseId, clientId: reporter.clientId },
      select: { id: true },
    });
    if (!source) throw httpError(400, "Source form response does not belong to your company.");
  }

  const created = await prisma.$transaction(async (tx) => {
    const nc = await tx.nonconformance.create({
      data: {
        ncNumber: ncNumber(),
        title,
        description,
        category,
        priority,
        reporterId: reporter.id,
        assigneeId: assignee.id,
        clientId: reporter.clientId,
        dueDate,
        status: "assigned",
        sourceFormResponseId,
      },
    });
    await tx.ncHistory.createMany({
      data: [
        {
          nonconformanceId: nc.id,
          action: "created",
          actorId: reporter.id,
          notes: `${nc.ncNumber} created.`,
        },
        {
          nonconformanceId: nc.id,
          action: "assigned",
          actorId: reporter.id,
          notes: `Assigned to ${assignee.firstName} ${assignee.lastName}`.trim(),
        },
      ],
    });
    return nc;
  });

  await safeNotify({
    nonconformance: created,
    recipient: assignee,
    actorId: reporter.id,
    type: "assigned",
    message: `${created.ncNumber} has been assigned to you and is due ${dueDate.toLocaleDateString("en-GB")}.`,
  });

  const data = await prisma.nonconformance.findUnique({
    where: { id: created.id },
    include: DETAIL_INCLUDE,
  });
  res.status(201).json({ success: true, data });
});

exports.list = asyncHandler(async (req, res) => {
  const user = await authContext(req);
  const where = { ...accessWhere(req, user) };
  const and = [];

  if (req.query.assignee) and.push({ assigneeId: String(req.query.assignee) });
  if (req.query.reporter) and.push({ reporterId: String(req.query.reporter) });
  if (req.query.status) {
    const statuses = String(req.query.status).split(",").filter((s) => STATUSES.has(s));
    if (statuses.length) and.push({ status: { in: statuses } });
  }
  if (req.query.priority) {
    const priorities = String(req.query.priority).split(",").filter((p) => PRIORITIES.has(p));
    if (priorities.length) and.push({ priority: { in: priorities } });
  }
  if (req.query.category) {
    and.push({ category: { equals: String(req.query.category), mode: "insensitive" } });
  }
  const from = req.query.from || req.query.startDate;
  const to = req.query.to || req.query.endDate;
  if (from || to) {
    const dueDate = {};
    if (from) dueDate.gte = parseDate(from, "Start date");
    if (to) dueDate.lte = parseDate(to, "End date");
    and.push({ dueDate });
  }
  if (and.length) where.AND = and;

  const rows = await prisma.nonconformance.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      reporter: { select: USER_SELECT },
      assignee: { select: USER_SELECT },
      responses: {
        where: { isDraft: false },
        orderBy: { version: "desc" },
        take: 1,
        include: { attachments: true },
      },
    },
  });
  res.json({ success: true, data: rows });
});

exports.getById = asyncHandler(async (req, res) => {
  const user = await authContext(req);
  const data = await findVisibleNc(req, user, DETAIL_INCLUDE);
  res.json({ success: true, data });
});

exports.saveResponse = asyncHandler(async (req, res) => {
  const user = await authContext(req);
  const nc = await findVisibleNc(req, user, {
    assignee: { select: USER_SELECT },
    reporter: { select: USER_SELECT },
    responses: { orderBy: { version: "desc" }, take: 1 },
  });
  if (nc.assigneeId !== user.id) throw httpError(403, "Only the assignee can respond.");
  if (["closed", "response_submitted", "under_review"].includes(nc.status)) {
    throw httpError(409, "This nonconformance is not open for an assignee response.");
  }

  const isDraft = req.body?.isDraft !== false;
  const correctionDone = String(req.body?.correctionDone || "").trim();
  const rootCause = String(req.body?.rootCause || "").trim();
  const correctiveAction = String(req.body?.correctiveAction || "").trim();
  if (!isDraft && (!correctionDone || !rootCause || !correctiveAction)) {
    throw httpError(400, "All three response fields are required before submission.");
  }

  const latest = nc.responses[0];
  const reusableDraft = latest?.isDraft ? latest : null;
  const response = await prisma.$transaction(async (tx) => {
    const saved = reusableDraft
      ? await tx.ncResponse.update({
          where: { id: reusableDraft.id },
          data: {
            correctionDone,
            rootCause,
            correctiveAction,
            isDraft,
            // Refresh the submitter: after an admin reassignment the reusable
            // draft may still carry the previous assignee's id.
            submittedById: user.id,
            submittedAt: isDraft ? null : new Date(),
          },
          include: { attachments: true },
        })
      : await tx.ncResponse.create({
          data: {
            nonconformanceId: nc.id,
            correctionDone,
            rootCause,
            correctiveAction,
            isDraft,
            version: (latest?.version || 0) + 1,
            submittedById: user.id,
            submittedAt: isDraft ? null : new Date(),
          },
          include: { attachments: true },
        });

    if (isDraft) {
      await tx.nonconformance.update({ where: { id: nc.id }, data: { status: "draft" } });
      await tx.ncHistory.create({
        data: {
          nonconformanceId: nc.id,
          action: "draft_saved",
          actorId: user.id,
          notes: `Response version ${saved.version} saved as draft.`,
        },
      });
    } else {
      await tx.nonconformance.update({
        where: { id: nc.id },
        data: { status: "under_review" },
      });
      await tx.ncHistory.createMany({
        data: [
          {
            nonconformanceId: nc.id,
            action: "response_submitted",
            actorId: user.id,
            notes: `Response version ${saved.version} submitted.`,
          },
          {
            nonconformanceId: nc.id,
            action: "under_review",
            actorId: user.id,
            notes: "Response moved to reporter review.",
          },
        ],
      });
    }
    return saved;
  });

  if (!isDraft) {
    await safeNotify({
      nonconformance: nc,
      recipient: nc.reporter,
      actorId: user.id,
      type: "response_submitted",
      message: `${nc.ncNumber} has a response ready for your review.`,
    });
  }

  res.json({
    success: true,
    message: isDraft ? "Draft saved." : "Response submitted for review.",
    data: response,
  });
});

exports.uploadAttachments = asyncHandler(async (req, res) => {
  const user = await authContext(req);
  const nc = await findVisibleNc(req, user);
  if (nc.assigneeId !== user.id) throw httpError(403, "Only the assignee can add evidence.");
  const responseId = String(req.body?.responseId || "").trim();
  if (!responseId) throw httpError(400, "responseId is required.");
  const response = await prisma.ncResponse.findFirst({
    where: { id: responseId, nonconformanceId: nc.id, submittedById: user.id },
  });
  if (!response) throw httpError(404, "Response version not found.");
  if (!response.isDraft) throw httpError(409, "Evidence can only be changed while the response is a draft.");

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) throw httpError(400, "Select at least one evidence file.");
  const rows = await prisma.$transaction(
    files.map((file) =>
      prisma.ncAttachment.create({
        data: {
          responseId,
          fileName: file.originalname,
          fileUrl: file.path || file.secure_url || file.url,
          mimeType: file.mimetype || "application/octet-stream",
          fileSize: file.size || null,
        },
      })
    )
  );
  res.status(201).json({ success: true, data: rows });
});

exports.accept = asyncHandler(async (req, res) => {
  const reporter = await authContext(req);
  const nc = await findVisibleNc(req, reporter, {
    assignee: { select: USER_SELECT },
  });
  if (nc.reporterId !== reporter.id) throw httpError(403, "Only the reporter can accept.");
  if (nc.status !== "under_review") throw httpError(409, "This response is not under review.");

  const closedAt = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.nonconformance.update({
      where: { id: nc.id },
      data: { status: "closed", closedAt },
    });
    await tx.ncHistory.createMany({
      data: [
        {
          nonconformanceId: nc.id,
          action: "accepted",
          actorId: reporter.id,
          notes: "Reporter accepted the response.",
        },
        {
          nonconformanceId: nc.id,
          action: "closed",
          actorId: reporter.id,
          notes: "Nonconformance closed.",
        },
      ],
    });
    return row;
  });

  await safeNotify({
    nonconformance: updated,
    recipient: nc.assignee,
    actorId: reporter.id,
    type: "accepted_closed",
    message: `${nc.ncNumber} was accepted and closed.`,
  });
  res.json({ success: true, data: updated });
});

exports.reject = asyncHandler(async (req, res) => {
  const reporter = await authContext(req);
  const reason = String(req.body?.reason || "").trim();
  if (!reason) throw httpError(400, "A rejection reason is required.");
  const nc = await findVisibleNc(req, reporter, {
    assignee: { select: USER_SELECT },
  });
  if (nc.reporterId !== reporter.id) throw httpError(403, "Only the reporter can reject.");
  if (nc.status !== "under_review") throw httpError(409, "This response is not under review.");

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.nonconformance.update({
      where: { id: nc.id },
      data: { status: "reopened", closedAt: null },
    });
    await tx.ncHistory.createMany({
      data: [
        {
          nonconformanceId: nc.id,
          action: "reopened",
          actorId: reporter.id,
          notes: "Reporter reopened the nonconformance.",
        },
        {
          nonconformanceId: nc.id,
          action: "rejection_reason",
          actorId: reporter.id,
          notes: reason,
        },
      ],
    });
    return row;
  });

  await safeNotify({
    nonconformance: updated,
    recipient: nc.assignee,
    actorId: reporter.id,
    type: "rejected_reopened",
    message: `${nc.ncNumber} was rejected and reopened. Reason: ${reason}`,
    reason,
  });
  res.json({ success: true, data: updated });
});

exports.reopen = asyncHandler(async (req, res) => {
  const reporter = await authContext(req);
  const reason = String(req.body?.reason || "").trim();
  if (!reason) throw httpError(400, "A reason for reopening is required.");

  const nc = await findVisibleNc(req, reporter, {
    assignee: { select: USER_SELECT },
  });
  if (nc.reporterId !== reporter.id) {
    throw httpError(403, "Only the reporter can reopen a closed nonconformance.");
  }
  if (nc.status !== "closed") {
    throw httpError(409, "Only a closed nonconformance can be reopened.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.nonconformance.update({
      where: { id: nc.id },
      data: { status: "reopened", closedAt: null },
    });
    await tx.ncHistory.create({
      data: {
        nonconformanceId: nc.id,
        action: "reopened",
        actorId: reporter.id,
        notes: reason,
      },
    });
    return row;
  });

  await safeNotify({
    nonconformance: updated,
    recipient: nc.assignee,
    actorId: reporter.id,
    type: "rejected_reopened",
    message: `${nc.ncNumber} was reopened. Reason: ${reason}`,
    reason,
  });
  res.json({ success: true, data: updated });
});

exports.assignableUsers = asyncHandler(async (req, res) => {
  const actor = await authContext(req);
  const nc = await findVisibleNc(req, actor);
  const users = await prisma.user.findMany({
    where: {
      clientId: nc.clientId,
      active: true,
      accessMode: { not: "view_only" },
    },
    select: USER_SELECT,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
  res.json({ success: true, data: users });
});

exports.reassign = asyncHandler(async (req, res) => {
  const actor = await authContext(req);
  const assigneeId = String(req.body?.assigneeId || "").trim();
  const reason = String(req.body?.reason || "").trim();
  if (!assigneeId || !reason) {
    throw httpError(400, "A new assignee and reason are required.");
  }

  const nc = await findVisibleNc(req, actor, {
    assignee: { select: USER_SELECT },
  });
  if (nc.assigneeId === assigneeId) {
    throw httpError(400, "Select a different assignee.");
  }

  const newAssignee = await prisma.user.findFirst({
    where: {
      id: assigneeId,
      clientId: nc.clientId,
      active: true,
      accessMode: { not: "view_only" },
    },
    select: USER_SELECT,
  });
  if (!newAssignee) {
    throw httpError(400, "Assignee must be an active user in the nonconformance company.");
  }

  const oldName = `${nc.assignee.firstName || ""} ${nc.assignee.lastName || ""}`.trim() || nc.assignee.email;
  const newName = `${newAssignee.firstName || ""} ${newAssignee.lastName || ""}`.trim() || newAssignee.email;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.nonconformance.update({
      where: { id: nc.id },
      data: { assigneeId: newAssignee.id },
    });
    await tx.ncHistory.create({
      data: {
        nonconformanceId: nc.id,
        action: "admin_override",
        actorId: actor.id,
        notes: `Reassigned from ${oldName} to ${newName}. Reason: ${reason}`,
      },
    });
    return row;
  });

  await Promise.all([
    safeNotify({
      nonconformance: updated,
      recipient: nc.assignee,
      actorId: actor.id,
      type: "assigned",
      message: `${nc.ncNumber} was reassigned from you to ${newName}. Reason: ${reason}`,
      reason,
    }),
    safeNotify({
      nonconformance: updated,
      recipient: newAssignee,
      actorId: actor.id,
      type: "assigned",
      message: `${nc.ncNumber} has been reassigned to you. Reason: ${reason}`,
      reason,
    }),
  ]);

  const data = await prisma.nonconformance.findUnique({
    where: { id: nc.id },
    include: DETAIL_INCLUDE,
  });
  res.json({ success: true, data });
});

exports.forceStatus = asyncHandler(async (req, res) => {
  const actor = await authContext(req);
  const status = String(req.body?.status || "").trim().toLowerCase();
  const reason = String(req.body?.reason || "").trim();
  if (!STATUSES.has(status) || !reason) {
    throw httpError(400, "A valid status and reason are required.");
  }

  const nc = await findVisibleNc(req, actor, {
    reporter: { select: USER_SELECT },
    assignee: { select: USER_SELECT },
  });
  if (nc.status === status) throw httpError(400, "Select a different status.");

  const previousStatus = nc.status;
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.nonconformance.update({
      where: { id: nc.id },
      data: {
        status,
        closedAt: status === "closed" ? new Date() : null,
      },
    });
    await tx.ncHistory.create({
      data: {
        nonconformanceId: nc.id,
        action: "admin_override",
        actorId: actor.id,
        notes: `Status forced from ${previousStatus} to ${status}. Reason: ${reason}`,
      },
    });
    return row;
  });

  const notification =
    status === "under_review" || status === "response_submitted"
      ? {
          recipient: nc.reporter,
          type: "response_submitted",
          message: `${nc.ncNumber} status was changed to ${status.replaceAll("_", " ")} by an administrator. Reason: ${reason}`,
        }
      : status === "closed"
        ? {
            recipient: nc.assignee,
            type: "accepted_closed",
            message: `${nc.ncNumber} was closed by an administrator. Reason: ${reason}`,
          }
        : status === "reopened"
          ? {
              recipient: nc.assignee,
              type: "rejected_reopened",
              message: `${nc.ncNumber} was reopened by an administrator. Reason: ${reason}`,
            }
          : status === "assigned"
            ? {
                recipient: nc.assignee,
                type: "assigned",
                message: `${nc.ncNumber} was moved to assigned by an administrator. Reason: ${reason}`,
              }
            : null;

  if (notification) {
    await safeNotify({
      nonconformance: updated,
      actorId: actor.id,
      reason,
      ...notification,
    });
  }

  const data = await prisma.nonconformance.findUnique({
    where: { id: nc.id },
    include: DETAIL_INCLUDE,
  });
  res.json({ success: true, data });
});

exports.history = asyncHandler(async (req, res) => {
  const user = await authContext(req);
  await findVisibleNc(req, user);
  const rows = await prisma.ncHistory.findMany({
    where: { nonconformanceId: req.params.id },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: USER_SELECT } },
  });
  res.json({ success: true, data: rows });
});
