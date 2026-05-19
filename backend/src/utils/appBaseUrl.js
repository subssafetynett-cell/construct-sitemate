const LOCAL_DEV_FALLBACK = "http://localhost:8080";

const PRODUCTION_URL_HINT =
  "Set APP_URL (or BASE_URL, or ALLOWED_ORIGINS) to your public SPA origin, e.g. APP_URL=https://site-mateai.co.uk";

/**
 * Canonical public URL of the SPA (no trailing slash).
 * Priority: APP_URL → BASE_URL → FRONTEND_URL → first ALLOWED_ORIGINS entry.
 */
function normalizeBaseUrl(raw) {
  if (raw == null || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function readFirstAllowedOrigin() {
  const raw = process.env.ALLOWED_ORIGINS || "";
  for (const part of raw.split(",")) {
    const normalized = normalizeBaseUrl(part);
    if (normalized) return { url: normalized, source: "ALLOWED_ORIGINS" };
  }
  return null;
}

function readConfiguredBaseUrl() {
  const keys = ["APP_URL", "BASE_URL", "FRONTEND_URL"];
  for (const key of keys) {
    const normalized = normalizeBaseUrl(process.env[key]);
    if (normalized) return { url: normalized, source: key };
  }
  return readFirstAllowedOrigin();
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * @returns {string} Origin of the frontend app (e.g. https://site-mateai.co.uk)
 */
function getAppBaseUrl() {
  const configured = readConfiguredBaseUrl();
  if (configured) return configured.url;

  if (isProduction()) {
    throw new Error(`Application base URL is not configured. ${PRODUCTION_URL_HINT}`);
  }

  console.warn(
    `[config] APP_URL is not set; using ${LOCAL_DEV_FALLBACK} for links in emails. ` +
      "Set APP_URL in .env for staging/production."
  );
  return LOCAL_DEV_FALLBACK;
}

/**
 * @param {string} pathname - Path starting with /
 */
function buildAppUrl(pathname = "/") {
  const base = getAppBaseUrl();
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/** Log configuration at startup; exits in production if no public URL is configured. */
function validateAppBaseUrlAtStartup() {
  try {
    const configured = readConfiguredBaseUrl();
    if (configured) {
      console.log(`[config] Application base URL (${configured.source}): ${configured.url}`);
      if (configured.source === "ALLOWED_ORIGINS" && isProduction()) {
        console.warn(
          "[config] Prefer APP_URL for password-reset and invite emails (ALLOWED_ORIGINS is a fallback)."
        );
      }
      return configured.url;
    }

    if (isProduction()) {
      console.error(
        `[config] FATAL: Application base URL is not configured in production. ${PRODUCTION_URL_HINT}`
      );
      process.exit(1);
    }

    console.warn(`[config] APP_URL not set; dev fallback for email links: ${LOCAL_DEV_FALLBACK}`);
    return LOCAL_DEV_FALLBACK;
  } catch (err) {
    console.error(`[config] FATAL: ${err.message}`);
    process.exit(1);
  }
}

module.exports = {
  getAppBaseUrl,
  buildAppUrl,
  validateAppBaseUrlAtStartup,
  normalizeBaseUrl,
};
