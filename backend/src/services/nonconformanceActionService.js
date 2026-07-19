const crypto = require("node:crypto");
const prisma = require("../prismaClient");
const { sendEmail } = require("./emailService");
const { buildAppUrl } = require("../utils/appBaseUrl");
const { escapeHtml } = require("../utils/htmlEscape");

function formatUserName(user) {
  if (!user) return "A user";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "A user";
}

function buildNonconformanceGroupKey(reporterId, answers = {}) {
  const parts = [
    String(reporterId || ""),
    String(answers.project_name || "").trim().toLowerCase(),
    String(answers.customer_reference || "").trim().toLowerCase(),
    String(answers.observation_details || "").trim().slice(0, 300).toLowerCase(),
    String(answers.full_address || "").trim().toLowerCase(),
  ];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 40);
}

function snapshotConcernAnswers(answers = {}) {
  const copy = { ...answers };
  delete copy.form_schema;
  delete copy.password;
  return copy;
}

function buildNonconformancePayload(answers = {}, formResponseId, reporterId, clientId) {
  const assigneeId = answers.noncon_responsible_user_id;
  if (!assigneeId || !reporterId || !clientId) return null;

  const correctionAction = String(answers.noncon_action || "").trim();
  const responsibleName = String(answers.noncon_responsible || "").trim();
  if (!correctionAction && !responsibleName) return null;

  if (String(assigneeId) === String(reporterId)) return null;

  const groupKey = buildNonconformanceGroupKey(reporterId, answers);
  const snapshot = snapshotConcernAnswers(answers);

  return {
    formResponseId: formResponseId || null,
    assigneeId: String(assigneeId),
    reporterId: String(reporterId),
    clientId: String(clientId),
    groupKey,
    title:
      String(answers.report_heading || "").trim() ||
      String(answers.project_name || "").trim() ||
      "Nonconformance report",
    correctionAction,
    responsibleEmail: answers.noncon_responsible_email || null,
    responsibleName: responsibleName || null,
    dateCompleted: answers.noncon_date || null,
    details: {
      ...snapshot,
      noncon_action: answers.noncon_action || "",
      noncon_responsible: answers.noncon_responsible || "",
      noncon_responsible_email: answers.noncon_responsible_email || "",
      noncon_date: answers.noncon_date || "",
      project_name: answers.project_name || "",
      customer_name: answers.customer_name || "",
      customer_reference: answers.customer_reference || "",
      observation_details: answers.observation_details || "",
      full_address: answers.full_address || "",
      exact_location: answers.exact_location || "",
      corrective_action: answers.corrective_action || "",
      incidents: Array.isArray(answers.incidents) ? answers.incidents : [],
      incidents_other: answers.incidents_other || "",
    },
  };
}

async function resolveNcAssignee(assigneeId, clientId) {
  const assignee = await prisma.user.findFirst({
    where: { id: assigneeId, clientId, active: true },
    select: { id: true, email: true, firstName: true, lastName: true, accessMode: true },
  });
  if (!assignee) {
    const error = new Error("Assignee must be an active user in your company.");
    error.status = 400;
    throw error;
  }
  if (String(assignee.accessMode || "standard").toLowerCase() === "view_only") {
    const error = new Error("A view-only user cannot be assigned a nonconformance.");
    error.status = 400;
    throw error;
  }
  return assignee;
}

async function createNcRecord({
  submitter,
  assignee,
  title,
  description,
  category,
  priority,
  dueDate,
  formResponseId,
  createdNote,
}) {
  const ncNumber = `NC-${new Date().getUTCFullYear()}-${crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()}`;

  const action = await prisma.$transaction(async (tx) => {
    const created = await tx.nonconformance.create({
      data: {
        ncNumber,
        title,
        description,
        category,
        priority,
        reporterId: submitter.id,
        assigneeId: assignee.id,
        clientId: submitter.clientId,
        dueDate,
        status: "assigned",
        sourceFormResponseId: formResponseId || null,
      },
    });
    await tx.ncHistory.createMany({
      data: [
        {
          nonconformanceId: created.id,
          action: "created",
          actorId: submitter.id,
          notes: `${created.ncNumber} ${createdNote}`,
        },
        {
          nonconformanceId: created.id,
          action: "assigned",
          actorId: submitter.id,
          notes: `Assigned to ${formatUserName(assignee)}.`,
        },
      ],
    });
    return created;
  });

  const { notifyNcUser } = require("./ncNotificationService");
  try {
    await notifyNcUser({
      nonconformance: action,
      recipient: assignee,
      actorId: submitter.id,
      type: "assigned",
      message: `${action.ncNumber} has been assigned to you and is due ${dueDate.toLocaleDateString("en-GB")}.`,
    });
  } catch (err) {
    console.error("NC assignment notification failed after creation:", err);
  }
  return action;
}

async function createNonconformanceFromFormSubmission({
  answers,
  formResponseId,
  submitterId,
}) {
  const submitter = await prisma.user.findUnique({
    where: { id: submitterId },
    select: { id: true, clientId: true, firstName: true, lastName: true, email: true },
  });
  if (!submitter?.clientId) return null;

  const assigneeId = String(answers?.noncon_responsible_user_id || "").trim();
  const dueDate = answers?.noncon_date ? new Date(answers.noncon_date) : null;
  if (!assigneeId || !dueDate || Number.isNaN(dueDate.getTime())) return null;
  if (formResponseId) {
    const existing = await prisma.nonconformance.findUnique({
      where: { sourceFormResponseId: formResponseId },
    });
    if (existing) return existing;
  }

  const assignee = await resolveNcAssignee(assigneeId, submitter.clientId);

  const category = String(answers?.noncon_category || answers?.category || "Concern").trim();
  const rawPriority = String(answers?.noncon_priority || "medium").toLowerCase();
  const priority = ["low", "medium", "high", "critical"].includes(rawPriority)
    ? rawPriority
    : "medium";
  const title =
    String(answers?.report_heading || answers?.project_name || "Nonconformance report").trim();
  const description =
    String(answers?.observation_details || answers?.noncon_action || title).trim();

  return createNcRecord({
    submitter,
    assignee,
    title,
    description,
    category,
    priority,
    dueDate,
    formResponseId,
    createdNote: "created from a concern report.",
  });
}

const SHEQ_DEFAULT_DUE_DAYS = 14;

/**
 * SHEQ service / installation reports collect nonconformance findings in
 * answers.formData.nonconformanceFindings. When at least one finding has a
 * responsible person selected, create a single NC record for the report so it
 * appears on the Nonconformance dashboard.
 */
async function createNonconformanceFromSheqSubmission({
  answers,
  formResponseId,
  submitterId,
  category,
}) {
  if (!formResponseId) return null;

  const rawFindings = answers?.formData?.nonconformanceFindings;
  if (!rawFindings || typeof rawFindings !== "object") return null;
  const findings = Object.entries(rawFindings)
    .map(([key, value]) => ({ key, ...(value || {}) }))
    .filter((f) => f && (f.itemName || f.remedialAction || f.personResponsibleId));
  const assignedFinding = findings.find((f) =>
    String(f.personResponsibleId || "").trim()
  );
  if (!assignedFinding) return null;

  const existing = await prisma.nonconformance.findUnique({
    where: { sourceFormResponseId: formResponseId },
  });
  if (existing) return existing;

  const submitter = await prisma.user.findUnique({
    where: { id: submitterId },
    select: { id: true, clientId: true, firstName: true, lastName: true, email: true },
  });
  if (!submitter?.clientId) return null;

  const assignee = await resolveNcAssignee(
    String(assignedFinding.personResponsibleId).trim(),
    submitter.clientId
  );

  const isService = /inspection/i.test(String(category || ""));
  const ncCategory = isService ? "SHEQ Service" : "SHEQ Installation";
  const client = String(answers?.formData?.client || "").trim();
  const reportName = String(answers?.name || "").trim();
  const title = `${client || reportName || ncCategory} — Nonconformance findings`;

  const description = findings
    .map((f) => {
      const item = String(f.itemName || f.key || "Checklist item").trim();
      const remedial = String(f.remedialAction || "").trim();
      const timing = String(f.timing || "").trim();
      let line = `• ${item}`;
      if (remedial) line += ` — ${remedial}`;
      if (timing) line += ` (timing: ${timing})`;
      return line;
    })
    .join("\n");

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + SHEQ_DEFAULT_DUE_DAYS);

  return createNcRecord({
    submitter,
    assignee,
    title,
    description: description || title,
    category: ncCategory,
    priority: "medium",
    dueDate,
    formResponseId,
    createdNote: `created from a ${ncCategory} report.`,
  });
}

async function notifyReporterOfSentAction(action, assignee, reporter, notes) {
  const assigneeName = formatUserName(assignee);
  await prisma.userNotification.create({
    data: {
      userId: reporter.id,
      type: "nonconformance_response",
      title: "Nonconformance response received",
      message: `${assigneeName} sent a response to your nonconformance report`,
      link: `/nonconformance?item=${action.id}`,
      metadata: { actionId: action.id, assigneeId: assignee.id },
    },
  });

  if (!reporter.email) return;

  const subject = `Nonconformance response: ${action.title}`;
  const html = `
    <p>Hello ${escapeHtml(formatUserName(reporter))},</p>
    <p><strong>${escapeHtml(assigneeName)}</strong> has sent a response to the nonconformance you reported.</p>
    <p><strong>Report:</strong> ${escapeHtml(action.title)}</p>
    <p><strong>Response:</strong></p>
    <p>${escapeHtml(notes || "No additional notes provided.")}</p>
    <p><a href="${escapeHtml(buildAppUrl(`/nonconformance?item=${action.id}`))}">View in Nonconformance</a></p>
  `;

  await sendEmail({
    to: reporter.email,
    subject,
    html,
  }).catch((err) => {
    console.error("Nonconformance response email failed:", err);
  });
}

async function notifyAssigneeOfRejectedAction(action, assignee, reporter, reason) {
  const reporterName = formatUserName(reporter);
  await prisma.userNotification.create({
    data: {
      userId: assignee.id,
      type: "nonconformance_rejected",
      title: "Nonconformance response rejected",
      message: `${reporterName} rejected your response and reopened the nonconformance`,
      link: `/nonconformance?item=${action.id}`,
      metadata: {
        actionId: action.id,
        reporterId: reporter.id,
        rejectionReason: reason,
      },
    },
  });

  if (!assignee.email) return;

  const subject = `Nonconformance reopened: ${action.title}`;
  const html = `
    <p>Hello ${escapeHtml(formatUserName(assignee))},</p>
    <p><strong>${escapeHtml(reporterName)}</strong> rejected your nonconformance response and reopened the item.</p>
    <p><strong>Report:</strong> ${escapeHtml(action.title)}</p>
    <p><strong>Reason for rejection:</strong></p>
    <p>${escapeHtml(reason)}</p>
    <p><a href="${escapeHtml(buildAppUrl(`/nonconformance?item=${action.id}`))}">Review and update the response</a></p>
  `;

  await sendEmail({
    to: assignee.email,
    subject,
    html,
  }).catch((err) => {
    console.error("Nonconformance rejection email failed:", err);
  });
}

module.exports = {
  buildNonconformanceGroupKey,
  buildNonconformancePayload,
  createNonconformanceFromFormSubmission,
  createNonconformanceFromSheqSubmission,
  formatUserName,
  notifyAssigneeOfRejectedAction,
  notifyReporterOfSentAction,
};
