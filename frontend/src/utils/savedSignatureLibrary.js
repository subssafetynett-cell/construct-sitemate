import api from "../services/api";

/**
 * Per-user saved signature library (server-backed; localStorage used only for one-time migration).
 */
export function getSavedSignatureStorageKey(userId) {
  return `savedSignatureLibrary:${userId || "me"}`;
}

/** Keep in sync with backend savedSignatureController isValidImageValue */
export function isValidSignatureImage(image) {
  if (!image) return true;
  if (typeof image !== "string") return false;
  return (
    image.startsWith("data:image") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  );
}

function hasDisplayableImage(row) {
  const image = row?.image;
  return (
    typeof image === "string" &&
    image.length > 0 &&
    isValidSignatureImage(image)
  );
}

function normalizeStoredImage(image) {
  if (!image || typeof image !== "string") return null;
  const trimmed = image.trim();
  if (!trimmed) return null;
  return isValidSignatureImage(trimmed) ? trimmed : null;
}

function mapSignatureRow(row, index) {
  return {
    id: row.id || `row-${index}`,
    label: typeof row.label === "string" ? row.label.trim() : "",
    image: normalizeStoredImage(row.image),
  };
}

/** All local rows for migration / offline management (includes entries without images). */
function localSignaturesFromStorage(userId) {
  return parseLocalStorageSignatures(userId);
}

function parseLocalStorageSignatures(userId) {
  try {
    const raw = localStorage.getItem(getSavedSignatureStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && typeof row === "object")
      .map((row, i) => mapSignatureRow(row, i));
  } catch {
    return [];
  }
}

/** Legacy browser storage — entries with a drawable image (picker). */
export function readSavedSignaturesFromLocalStorage(userId) {
  return parseLocalStorageSignatures(userId).filter(hasDisplayableImage);
}

export async function fetchSavedSignatures() {
  const res = await api.get("/saved-signatures");
  const rows = Array.isArray(res.data?.signatures) ? res.data.signatures : [];
  return rows.map((row, i) => mapSignatureRow(row, i));
}

/** Entries that have an image, suitable for the "select saved" picker. */
export async function fetchSavedSignaturesWithImages() {
  const rows = await fetchSavedSignatures();
  return rows.filter(hasDisplayableImage);
}

export async function syncSavedSignatures(signatures) {
  const payload = signatures.map(({ id, label, image }) => ({
    id,
    label: (label || "").trim(),
    image: image || null,
  }));
  const res = await api.put("/saved-signatures", { signatures: payload });
  const rows = Array.isArray(res.data?.signatures) ? res.data.signatures : payload;
  return rows.map((row, i) => mapSignatureRow(row, i));
}

/**
 * Load from API; if empty, migrate once from localStorage then sync to server.
 */
export async function loadSavedSignaturesWithMigration(userId) {
  try {
    const remote = await fetchSavedSignatures();
    if (remote.length > 0) {
      return { signatures: remote, migrated: false };
    }
    const local = localSignaturesFromStorage(userId);
    if (local.length > 0) {
      const persisted = await syncSavedSignatures(local);
      try {
        localStorage.removeItem(getSavedSignatureStorageKey(userId));
      } catch {
        /* ignore */
      }
      return { signatures: persisted, migrated: true };
    }
    return { signatures: [], migrated: false };
  } catch (err) {
    console.error("Failed to load saved signatures from server:", err);
    const local = localSignaturesFromStorage(userId);
    if (local.length > 0) {
      return { signatures: local, migrated: false, offline: true };
    }
    throw err;
  }
}
