const nodemailer = require("nodemailer");

const DEFAULT_CONNECTION_TIMEOUT_MS = 25_000;
const PLACEHOLDER_SMTP_HOSTS = new Set(["smtp.example.com"]);

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function parsePort(raw, fallback = 587) {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function smtpHost() {
  return String(process.env.SMTP_HOST || "").trim();
}

function isLocalRelayHost(host) {
  return /^(mailpit|localhost|127\.0\.0\.1)$/i.test(host);
}

function resendApiKey() {
  return String(process.env.RESEND_API_KEY || "").trim();
}

function smtpCredentials() {
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();
  if (!user || !pass) return null;
  return { user, pass };
}

function inferSmtpHostFromEmail(email) {
  const lower = String(email || "").toLowerCase();
  if (lower.endsWith("@gmail.com") || lower.endsWith("@googlemail.com")) {
    return "smtp.gmail.com";
  }
  if (/@(outlook|hotmail|live)\./i.test(lower)) {
    return "smtp.office365.com";
  }
  if (lower.endsWith("@yahoo.com")) {
    return "smtp.mail.yahoo.com";
  }
  return null;
}

/**
 * Resolve how outbound mail should be sent.
 * @returns {{ mode: 'resend' | 'direct' | 'mailpit' | 'none', host?: string, port?: number, user?: string, pass?: string }}
 */
function resolveTransportPlan() {
  if (resendApiKey()) {
    return { mode: "resend" };
  }

  const creds = smtpCredentials();
  const relayHost = String(process.env.SMTP_RELAY_HOST || "").trim();
  const configuredHost = smtpHost();

  if (creds) {
    let host = relayHost || configuredHost;
    if (!host || isLocalRelayHost(host)) {
      host = inferSmtpHostFromEmail(creds.user) || relayHost || "";
    }
    if (!host) {
      return { mode: "none" };
    }
    const port = parsePort(
      relayHost && (!configuredHost || isLocalRelayHost(configuredHost))
        ? process.env.SMTP_RELAY_PORT
        : process.env.SMTP_PORT,
      587
    );
    return { mode: "direct", host, port, ...creds };
  }

  if (configuredHost && !isLocalRelayHost(configuredHost)) {
    return { mode: "none" };
  }

  if (!isProduction()) {
    return { mode: "mailpit", host: configuredHost || "mailpit", port: 1025 };
  }

  return { mode: "none" };
}

function isExternalDeliveryConfigured() {
  const plan = resolveTransportPlan();
  return plan.mode === "resend" || plan.mode === "direct";
}

function isSmtpConfigured() {
  const plan = resolveTransportPlan();
  return plan.mode !== "none";
}

function getSmtpOptions(plan) {
  const secure =
    process.env.SMTP_SECURE === "true" ||
    process.env.SMTP_SECURE === "1" ||
    plan.port === 465;

  const options = {
    host: plan.host,
    port: plan.port,
    secure,
    connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    greetingTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    socketTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
    auth: { user: plan.user, pass: plan.pass },
  };

  if (process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "0") {
    options.tls = { rejectUnauthorized: false };
  }

  return options;
}

let transporterPromise = null;
let transportPlan = null;

function buildSendResult({ success, error, messageId, mode }) {
  const plan = mode || transportPlan?.mode || "none";
  const external = success && (plan === "resend" || plan === "direct");
  return {
    success: Boolean(success),
    error: error || null,
    messageId: messageId || null,
    delivery: success ? plan : "none",
    deliveredToInbox: external,
  };
}

function extractLinksFromHtml(html) {
  return [...String(html || "").matchAll(/href="(https?:\/\/[^"]+)"/gi)].map((m) => m[1]);
}

async function sendViaResend({ to, subject, html, from }) {
  const apiKey = resendApiKey();
  const fromAddr = from || process.env.SMTP_FROM || "Sitemate <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: fromAddr, to: [to], subject, html }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = body?.message || body?.error || `Resend API error (${response.status})`;
    throw new Error(msg);
  }
  return body?.id || "resend";
}

async function createEmailTransporter() {
  transportPlan = resolveTransportPlan();

  if (transportPlan.mode === "none") {
    console.error(
      "[email] Not configured. Add to .env:\n" +
        "  RESEND_API_KEY=re_...  (easiest), or\n" +
        "  SMTP_USER + SMTP_PASS (+ SMTP_RELAY_HOST or SMTP_HOST for non-Gmail)\n" +
        "Then restart: docker compose up -d --build"
    );
    return null;
  }

  if (transportPlan.mode === "resend") {
    console.log("[email] Resend API configured — emails will be delivered to real inboxes");
    return { kind: "resend" };
  }

  if (transportPlan.mode === "mailpit") {
    const transport = nodemailer.createTransport({
      host: transportPlan.host,
      port: transportPlan.port,
      secure: false,
      connectionTimeout: DEFAULT_CONNECTION_TIMEOUT_MS,
      tls: { rejectUnauthorized: false },
    });
    try {
      await transport.verify();
      console.log(
        `[email] Mailpit only (${transportPlan.host}:${transportPlan.port}) — ` +
          "local capture, not real inboxes. Add SMTP_USER/SMTP_PASS or RESEND_API_KEY to .env"
      );
      if (!isProduction()) {
        console.log("[email] View captured mail at http://localhost:8025");
      }
      return { kind: "mailpit", transport };
    } catch (err) {
      console.error("[email] Mailpit connection failed:", err.message);
      return null;
    }
  }

  const options = getSmtpOptions(transportPlan);
  const transport = nodemailer.createTransport(options);
  try {
    await transport.verify();
    console.log(`[email] Direct SMTP ready — ${options.host}:${options.port} → real inboxes`);
    return { kind: "direct", transport };
  } catch (err) {
    console.error(`[email] SMTP verify failed (${options.host}:${options.port}):`, err.message);
    return null;
  }
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = createEmailTransporter();
  }
  return transporterPromise;
}

async function logEmailTransportAtStartup() {
  await getTransporter();
  const plan = transportPlan || resolveTransportPlan();
  if (plan.mode === "resend") {
    console.log("[email] Outbound mail: Resend API");
  } else if (plan.mode === "direct") {
    console.log(`[email] Outbound mail: direct SMTP (${plan.host}:${plan.port})`);
  } else if (plan.mode === "mailpit") {
    console.log("[email] Outbound mail: Mailpit (local dev only)");
  } else {
    console.warn("[email] Outbound mail: DISABLED — configure RESEND_API_KEY or SMTP in .env");
  }
}

function describeInviteEmailResult(emailResult) {
  if (!emailResult?.success) {
    return {
      emailSent: false,
      emailError: emailResult?.error || "Email delivery failed",
      message:
        "User created, but the welcome email could not be sent. Add RESEND_API_KEY or SMTP_USER/SMTP_PASS to .env and restart the backend.",
    };
  }

  if (emailResult.deliveredToInbox) {
    return {
      emailSent: true,
      emailError: null,
      message:
        "User invited. A welcome email with their name, password, and verification link was sent to their inbox. They must verify their email before signing in.",
    };
  }

  return {
    emailSent: true,
    emailCapturedInMailpit: true,
    emailError: null,
    message:
      "User invited. Welcome email captured in local Mailpit (http://localhost:8025) — not a real inbox. Add RESEND_API_KEY or SMTP credentials to .env for real delivery.",
  };
}

const sendEmailNow = async ({ to, subject, html, replyTo, from }) => {
  try {
    const sender = await getTransporter();
    if (!sender) {
      return buildSendResult({
        success: false,
        error:
          "Email is not configured. Set RESEND_API_KEY or SMTP_USER + SMTP_PASS in .env, then restart Docker.",
      });
    }

    const fromAddr =
      from || process.env.SMTP_FROM || '"Sitemate" <no-reply@sitemate.local>';

    if (sender.kind === "resend") {
      const messageId = await sendViaResend({ to, subject, html, from: fromAddr });
      console.log("[email] Sent via Resend:", messageId, "→", to);
      return buildSendResult({ success: true, messageId, mode: "resend" });
    }

    const info = await sender.transport.sendMail({
      from: fromAddr,
      to,
      subject,
      html,
      replyTo,
    });

    const mode = sender.kind;
    if (mode === "mailpit") {
      console.log(`[email] Captured in Mailpit → ${to}`);
      const links = extractLinksFromHtml(html);
      for (const link of links) {
        console.log("[email]   link:", link);
      }
    } else {
      console.log("[email] Sent:", info.messageId, "→", to);
    }

    return buildSendResult({ success: true, messageId: info.messageId, mode });
  } catch (error) {
    console.error("[email] Send failed:", error);
    const message = error?.message || "Email delivery failed";
    if (/invalid login|authentication|535|534/i.test(message)) {
      return buildSendResult({
        success: false,
        error:
          "SMTP login failed. For Gmail use an App Password (not your normal password). Check SMTP_USER and SMTP_PASS.",
      });
    }
    if (/timeout|timed out|ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(message)) {
      const plan = resolveTransportPlan();
      return buildSendResult({
        success: false,
        error: `Could not reach mail server (${plan.host || "not configured"}). Check SMTP settings and restart.`,
      });
    }
    return buildSendResult({ success: false, error: message });
  }
};

/** Queue when Redis/BullMQ is available; otherwise send immediately. */
const sendEmail = async (payload) => {
  if (process.env.EMAIL_QUEUE_DISABLED === "1") {
    return sendEmailNow(payload);
  }
  try {
    const { enqueueEmail, isQueueEnabled } = require("./jobQueue");
    if (isQueueEnabled()) {
      return enqueueEmail(payload);
    }
  } catch {
    /* fall through */
  }
  return sendEmailNow(payload);
};

module.exports = {
  sendEmail,
  sendEmailNow,
  logEmailTransportAtStartup,
  isSmtpConfigured,
  isExternalDeliveryConfigured,
  describeInviteEmailResult,
  resolveTransportPlan,
};
