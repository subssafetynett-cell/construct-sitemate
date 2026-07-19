const asyncHandler = require("express-async-handler");
const prisma = require("../prismaClient");
const { reqUserDbId } = require("../utils/userAuthorization");

exports.listNotifications = asyncHandler(async (req, res) => {
  const userId = reqUserDbId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200);
  const [legacyRows, ncRows] = await Promise.all([
    prisma.userNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);
  const titles = {
    assigned: "Nonconformance assigned",
    response_submitted: "Response ready for review",
    rejected_reopened: "Nonconformance reopened",
    accepted_closed: "Nonconformance closed",
  };
  const normalized = ncRows.map((row) => ({
    ...row,
    title: titles[row.type] || "Nonconformance update",
    link: `/nc/${row.nonconformanceId}`,
    read: row.isRead,
  }));
  const rows = [...legacyRows, ...normalized]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  res.json({ success: true, data: rows });
});

exports.unreadCount = asyncHandler(async (req, res) => {
  const userId = reqUserDbId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const [legacyCount, ncCount] = await Promise.all([
    prisma.userNotification.count({ where: { userId, read: false } }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  const count = legacyCount + ncCount;

  res.json({ success: true, count });
});

exports.markRead = asyncHandler(async (req, res) => {
  const userId = reqUserDbId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  await Promise.all([
    prisma.userNotification.updateMany({
      where: { id: req.params.id, userId },
      data: { read: true },
    }),
    prisma.notification.updateMany({
      where: { id: req.params.id, userId },
      data: { isRead: true },
    }),
  ]);

  res.json({ success: true });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  const userId = reqUserDbId(req);
  if (!userId) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  await Promise.all([
    prisma.userNotification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    }),
    prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    }),
  ]);

  res.json({ success: true });
});
