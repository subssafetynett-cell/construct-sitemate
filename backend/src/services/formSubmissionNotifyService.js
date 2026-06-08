const prisma = require("../prismaClient");
const { sendEmail } = require("./emailService");
const { buildAppUrl } = require("../utils/appBaseUrl");
const { escapeHtml } = require("../utils/htmlEscape");
const { APP_PAGES } = require("../constants/pageAccess");

const CATEGORY_PATH = {};
for (const page of APP_PAGES) {
  if (page.label && page.paths?.length) {
    CATEGORY_PATH[page.label] = page.paths[0];
  }
}

function formatUserName(user) {
  if (!user) return "A user";
  const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  return name || user.email || "A user";
}

function resolveFormTitle(answers, formTitle) {
  const a = answers && typeof answers === "object" ? answers : {};
  const custom =
    (typeof a.name === "string" && a.name.trim()) ||
    (typeof a.report_heading === "string" && a.report_heading.trim()) ||
    (typeof a.formMetadata?.name === "string" && a.formMetadata.name.trim()) ||
    "";
  return custom || formTitle || "Untitled form";
}

function resolvePageLabel(category, formTitle) {
  const cat = (category || "").trim();
  if (cat) return cat;
  return formTitle || "Forms";
}

function resolvePagePath(pageLabel) {
  if (CATEGORY_PATH[pageLabel]) return CATEGORY_PATH[pageLabel];
  if (pageLabel === "Friday Pack Forms") return "/sitepack-management";
  if (pageLabel.includes("SHEQ Installation")) return "/shq-installation";
  if (pageLabel.includes("SHEQ")) return "/sheq-inspection";
  if (pageLabel === "General forms" || pageLabel === "Templates") {
    return "/general-forms";
  }
  return "/dashboard";
}

async function findAdminRecipients(submitter) {
  if (!submitter?.id) return [];

  const [superadmins, companyAdmins] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: "superadmin" },
      select: { id: true, email: true, firstName: true, lastName: true },
    }),
    submitter.clientId
      ? prisma.user.findMany({
          where: {
            active: true,
            role: "company_admin",
            clientId: submitter.clientId,
          },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set();
  const recipients = [];

  for (const user of [...companyAdmins, ...superadmins]) {
    const email = (user.email || "").trim().toLowerCase();
    if (!email || user.id === submitter.id || seen.has(email)) continue;
    seen.add(email);
    recipients.push(user);
  }

  return recipients;
}

function buildNotificationHtml({
  submitterName,
  submitterEmail,
  companyName,
  pageLabel,
  formTitle,
  submittedAt,
  viewUrl,
}) {
  const safeSubmitter = escapeHtml(submitterName);
  const safeEmail = escapeHtml(submitterEmail || "");
  const safeCompany = escapeHtml(companyName || "—");
  const safePage = escapeHtml(pageLabel);
  const safeForm = escapeHtml(formTitle);
  const safeWhen = escapeHtml(submittedAt);
  const safeUrl = escapeHtml(viewUrl);

  return `
    <div style="font-family: sans-serif; color: #1B212C; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 10px;">
      <h2 style="color: #0B4DA6; border-bottom: 2px solid #0B4DA6; padding-bottom: 10px;">New form submission</h2>
      <p><strong>${safeSubmitter}</strong>${safeEmail ? ` (${safeEmail})` : ""} saved a form on the <strong>${safePage}</strong> page.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #E89F17;">
        <p style="margin: 0 0 8px 0;"><strong>Form:</strong> ${safeForm}</p>
        <p style="margin: 0 0 8px 0;"><strong>Page:</strong> ${safePage}</p>
        <p style="margin: 0 0 8px 0;"><strong>Company:</strong> ${safeCompany}</p>
        <p style="margin: 0;"><strong>Submitted:</strong> ${safeWhen}</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}" style="display: inline-block; background: #0B4DA6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in Sitemate</a>
      </p>
      <p style="font-size: 0.9em; color: #666;">You are receiving this because you are a company or platform administrator.</p>
      <p style="margin-top: 24px; font-size: 0.9em; color: #666;">— The Sitemate Team</p>
    </div>
  `;
}

/**
 * Notify company admins and superadmins when a user submits a new form.
 * Fire-and-forget — errors are logged, not thrown.
 */
async function notifyAdminsOfNewFormSubmission({
  submitterId,
  formTitle,
  category,
  answers,
}) {
  if (!submitterId) return;

  const submitter = await prisma.user.findUnique({
    where: { id: submitterId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      companyname: true,
      clientId: true,
      client: { select: { name: true } },
    },
  });

  if (!submitter) return;

  const recipients = await findAdminRecipients(submitter);
  if (!recipients.length) return;

  const submitterName = formatUserName(submitter);
  const pageLabel = resolvePageLabel(category, formTitle);
  const formTitleResolved = resolveFormTitle(answers, formTitle);
  const companyName =
    submitter.client?.name || submitter.companyname || "";
  const submittedAt = new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const viewUrl = buildAppUrl(resolvePagePath(pageLabel));

  const html = buildNotificationHtml({
    submitterName,
    submitterEmail: submitter.email,
    companyName,
    pageLabel,
    formTitle: formTitleResolved,
    submittedAt,
    viewUrl,
  });

  const subject = `Form saved: ${submitterName} — ${pageLabel}`;

  await Promise.allSettled(
    recipients.map((admin) =>
      sendEmail({
        to: admin.email,
        subject,
        html,
        replyTo: submitter.email || undefined,
      })
    )
  );
}

module.exports = { notifyAdminsOfNewFormSubmission };
