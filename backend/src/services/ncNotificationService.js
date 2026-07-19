const prisma = require("../prismaClient");
const { sendEmail } = require("./emailService");
const { buildAppUrl } = require("../utils/appBaseUrl");
const { escapeHtml } = require("../utils/htmlEscape");

const COPY = {
  assigned: {
    subject: (nc) => `Nonconformance assigned: ${nc.ncNumber}`,
    heading: "New nonconformance assigned",
  },
  response_submitted: {
    subject: (nc) => `Nonconformance response submitted: ${nc.ncNumber}`,
    heading: "Nonconformance response submitted",
  },
  rejected_reopened: {
    subject: (nc) => `Nonconformance reopened: ${nc.ncNumber}`,
    heading: "Nonconformance rejected and reopened",
  },
  accepted_closed: {
    subject: (nc) => `Nonconformance closed: ${nc.ncNumber}`,
    heading: "Nonconformance accepted and closed",
  },
};

async function notifyNcUser({
  nonconformance,
  recipient,
  actorId,
  type,
  message,
  reason,
}) {
  const copy = COPY[type];
  if (!copy || !recipient?.id) {
    throw new Error("Invalid NC notification request");
  }

  const link = `/nc/${nonconformance.id}`;
  const notification = await prisma.notification.create({
    data: {
      userId: recipient.id,
      nonconformanceId: nonconformance.id,
      type,
      message,
    },
  });

  await prisma.ncHistory.create({
    data: {
      nonconformanceId: nonconformance.id,
      action: "notification_sent",
      actorId,
      notes: `${copy.heading} sent to ${recipient.email || recipient.id}.`,
    },
  });

  if (recipient.email) {
    const reasonHtml = reason
      ? `<p><strong>Reason:</strong></p><p>${escapeHtml(reason)}</p>`
      : "";
    const html = `
      <p>Hello ${escapeHtml(`${recipient.firstName || ""} ${recipient.lastName || ""}`.trim() || recipient.email)},</p>
      <p>${escapeHtml(message)}</p>
      ${reasonHtml}
      <p><a href="${escapeHtml(buildAppUrl(link))}">Open ${escapeHtml(nonconformance.ncNumber)}</a></p>
    `;

    try {
      await sendEmail({
        to: recipient.email,
        subject: copy.subject(nonconformance),
        html,
      });
      await prisma.ncHistory.create({
        data: {
          nonconformanceId: nonconformance.id,
          action: "email_sent",
          actorId,
          notes: `Email sent to ${recipient.email}.`,
        },
      });
    } catch (err) {
      console.error(`NC ${type} email failed:`, err);
    }
  }

  return { ...notification, link };
}

module.exports = { notifyNcUser };
