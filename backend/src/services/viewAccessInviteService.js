const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const prisma = require("../prismaClient");
const { sendEmail } = require("./emailService");
const { buildAppUrl } = require("../utils/appBaseUrl");
const { escapeHtml } = require("../utils/htmlEscape");
const { validateNewPassword } = require("../utils/passwordPolicy");
const { invalidateSessionUserCache } = require("../utils/userAuthorization");
const { mergeWithAlwaysOn, normalizeAllowedPages } = require("../utils/pageAccess");

const INVITE_LINK_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_EXPIRY_MS = 30 * 60 * 1000;
const INVITE_EMAIL_TIMEOUT_MS = 12_000;

function hashToken(token) {
  return crypto.createHash("sha256").update(String(token)).digest("hex");
}

function hashOtp(otp) {
  return crypto.createHash("sha256").update(String(otp)).digest("hex");
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function maskEmail(email) {
  const [local, domain] = String(email || "").split("@");
  if (!domain) return "***";
  const visible = local.length <= 2 ? local[0] || "*" : `${local[0]}***${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

function timingSafeEqualHex(a, b) {
  try {
    const ba = Buffer.from(String(a), "hex");
    const bb = Buffer.from(String(b), "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

async function invalidateViewInvitesForUser(userId) {
  await prisma.emailVerificationToken.updateMany({
    where: { userId, kind: "view_access", usedAt: null },
    data: { usedAt: new Date() },
  });
}

async function sendViewAccessInviteEmail(user, { companyName, pageLabels = [] }) {
  await invalidateViewInvitesForUser(user.id);

  const rawToken = crypto.randomBytes(32).toString("hex");
  const otp = generateOtp();
  const now = Date.now();
  const expiresAt = new Date(now + INVITE_LINK_EXPIRY_MS);
  const otpExpiresAt = new Date(now + OTP_EXPIRY_MS);

  await prisma.emailVerificationToken.create({
    data: {
      tokenHash: hashToken(rawToken),
      userId: user.id,
      expiresAt,
      otpHash: hashOtp(otp),
      otpExpiresAt,
      kind: "view_access",
    },
  });

  const inviteUrl = buildAppUrl(`/view-invite/${rawToken}`);
  const firstName = escapeHtml((user.firstName || "").trim() || "there");
  const safeCompany = escapeHtml(companyName || "your organisation");
  const safeEmail = escapeHtml(user.email);
  const safeOtp = escapeHtml(otp);
  const safeUrl = escapeHtml(inviteUrl);
  const pagesHtml =
    pageLabels.length > 0
      ? `<ul style="margin:8px 0;padding-left:20px;">${pageLabels
          .map((l) => `<li>${escapeHtml(l)}</li>`)
          .join("")}</ul>`
      : "<p>You will have view-only access to selected areas of Sitemate.</p>";

  const html = `
    <div style="font-family: sans-serif; color: #1B212C; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 24px; border-radius: 10px;">
      <h2 style="color: #0B4DA6; border-bottom: 2px solid #0B4DA6; padding-bottom: 10px;">You're invited to view Sitemate</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>You have been invited to join <strong>${safeCompany}</strong> with <strong>view-only</strong> access.</p>
      ${pagesHtml}
      <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:24px 0;text-align:center;border-left:5px solid #0B4DA6;">
        <p style="margin:0 0 8px 0;font-size:0.9em;color:#666;">Your verification code</p>
        <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:6px;color:#0B4DA6;">${safeOtp}</p>
        <p style="margin:12px 0 0 0;font-size:0.85em;color:#666;">This code expires in 30 minutes.</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="${safeUrl}" style="display: inline-block; background: #0B4DA6; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Open invitation</a>
      </p>
      <p style="font-size: 0.9em; color: #666;">On that page, enter the code above and choose a password for <strong>${safeEmail}</strong>. The link expires in 7 days.</p>
      <p style="font-size: 0.9em; color: #666; word-break: break-all;">Or copy this link:<br/><a href="${safeUrl}" style="color: #0B4DA6;">${safeUrl}</a></p>
      <p style="margin-top: 24px; font-size: 0.9em; color: #666;">— The Sitemate Team</p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: "Your Sitemate view-access invitation",
    html,
  });
}

async function sendViewAccessInviteEmailWithTimeout(user, options, timeoutMs = INVITE_EMAIL_TIMEOUT_MS) {
  let timerId;
  const timeoutPromise = new Promise((resolve) => {
    timerId = setTimeout(
      () => resolve({ success: false, error: "Invitation email timed out. Try again." }),
      timeoutMs
    );
  });
  try {
    return await Promise.race([sendViewAccessInviteEmail(user, options), timeoutPromise]);
  } catch (err) {
    return { success: false, error: err.message || "Email delivery failed" };
  } finally {
    clearTimeout(timerId);
  }
}

async function loadViewInviteByToken(rawToken) {
  const token = String(rawToken || "").trim();
  if (!token) {
    const err = new Error("Invitation link is invalid");
    err.status = 400;
    throw err;
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          active: true,
          emailVerified: true,
          companyname: true,
          accessMode: true,
          allowedPages: true,
        },
      },
    },
  });

  if (!record || record.kind !== "view_access" || record.usedAt || record.expiresAt < new Date()) {
    const err = new Error("This invitation link is invalid or has expired. Ask your administrator to send a new invite.");
    err.status = 400;
    throw err;
  }

  if (!record.user?.active) {
    const err = new Error("This account is disabled. Contact your administrator.");
    err.status = 403;
    throw err;
  }

  return { record, token };
}

async function getViewInvitePreview(rawToken) {
  const { record } = await loadViewInviteByToken(rawToken);
  return {
    email: record.user.email,
    emailMasked: maskEmail(record.user.email),
    companyName: record.user.companyname || "your organisation",
    firstName: record.user.firstName || "",
    alreadyVerified: Boolean(record.user.emailVerified),
  };
}

async function acceptViewInviteWithOtp({ token, otp, password }) {
  const pwdCheck = validateNewPassword(password);
  if (!pwdCheck.ok) {
    const err = new Error(pwdCheck.message);
    err.status = 400;
    throw err;
  }

  const otpStr = String(otp || "").trim();
  if (!/^\d{6}$/.test(otpStr)) {
    const err = new Error("Enter the 6-digit verification code from your email");
    err.status = 400;
    throw err;
  }

  const { record } = await loadViewInviteByToken(token);

  if (!record.otpHash || !record.otpExpiresAt || record.otpExpiresAt < new Date()) {
    const err = new Error("Your verification code has expired. Ask your administrator to send a new invitation.");
    err.status = 400;
    throw err;
  }

  if (!timingSafeEqualHex(hashOtp(otpStr), record.otpHash)) {
    const err = new Error("Incorrect verification code. Check the code in your email and try again.");
    err.status = 400;
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const existingPages = normalizeAllowedPages(record.user.allowedPages, {
    forViewOnly: true,
  });
  const allowedPages = mergeWithAlwaysOn(
    existingPages.length > 0 ? existingPages : ["dashboard"],
    { forViewOnly: true }
  );

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        password: hashedPassword,
        emailVerified: true,
        active: true,
        accessMode: "view_only",
        allowedPages,
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, usedAt: null, id: { not: record.id } },
      data: { usedAt: new Date() },
    }),
  ]);

  invalidateSessionUserCache(record.userId);

  return { ok: true };
}

module.exports = {
  sendViewAccessInviteEmail,
  sendViewAccessInviteEmailWithTimeout,
  getViewInvitePreview,
  acceptViewInviteWithOtp,
  maskEmail,
};
