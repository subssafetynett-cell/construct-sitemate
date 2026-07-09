/**
 * Local form response drafts for offline create / edit / submit.
 */
import {
  openOfflineDb,
  txDone,
  isOfflineLocalId,
  createLocalResponseId,
  notifyQueueChanged,
} from "./offlineStore.js";

const STORE = "formDrafts";

export { isOfflineLocalId, createLocalResponseId };

function nowIso() {
  return new Date().toISOString();
}

function compactAnswers(answers) {
  if (!answers || typeof answers !== "object") return answers ?? {};
  const out = {};
  for (const [key, value] of Object.entries(answers)) {
    if (typeof value === "string" && value.startsWith("data:image")) continue;
    if (key === "docInfo" && value && typeof value === "object") {
      const { logo, logoRight, signature, ...rest } = value;
      out.docInfo = { ...rest };
      continue;
    }
    if (key === "formData" && value && typeof value === "object") {
      const { images, ...formRest } = value;
      const imageCount = Array.isArray(images) ? images.length : 0;
      out.formData = {
        ...formRest,
        ...(imageCount ? { images: { _count: imageCount } } : {}),
      };
      continue;
    }
    if (Array.isArray(value) && value.some((v) => typeof v === "string" && v.startsWith("data:image"))) {
      out[key] = { _count: value.length };
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function draftToListRow(draft) {
  const id = draft.serverId || draft.localId;
  return {
    id,
    _id: id,
    formId: draft.formId,
    category: draft.category,
    siteId: draft.siteId ?? null,
    subfolderId: draft.subfolderId ?? null,
    answers: compactAnswers(draft.answers),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    pendingSync: true,
    offlineDraft: true,
    form: draft.formTitle ? { title: draft.formTitle } : undefined,
  };
}

export function draftToDetailRow(draft) {
  const id = draft.serverId || draft.localId;
  return {
    id,
    _id: id,
    formId: draft.formId,
    category: draft.category,
    siteId: draft.siteId ?? null,
    subfolderId: draft.subfolderId ?? null,
    answers: draft.answers ?? {},
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    pendingSync: true,
    offlineDraft: true,
    form: draft.formTitle ? { title: draft.formTitle } : undefined,
  };
}

function normalizeCategory(value) {
  if (value == null) return "";
  return String(value).trim();
}

/** Match drafts to list query params (category, siteId, subfolderId). */
export function draftMatchesListParams(draft, params = {}) {
  const qCategory = normalizeCategory(params.category);
  if (qCategory) {
    const parts = qCategory.split(",").map((p) => p.trim()).filter(Boolean);
    const draftCat = normalizeCategory(draft.category);
    if (parts.length > 1) {
      if (!parts.includes(draftCat)) return false;
    } else if (draftCat !== qCategory) {
      return false;
    }
  }
  if (params.siteId != null && String(params.siteId).trim() !== "") {
    if (String(draft.siteId || "") !== String(params.siteId).trim()) return false;
  }
  if (params.subfolderId != null && String(params.subfolderId).trim() !== "") {
    if (String(draft.subfolderId || "") !== String(params.subfolderId).trim()) return false;
  }
  return true;
}

export async function getOfflineDraftByAnyId(id) {
  if (!id) return null;
  const db = await openOfflineDb();
  const byLocal = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(String(id));
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (byLocal) {
    db.close();
    return byLocal;
  }
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all.find((d) => d.serverId === id) || null;
}

export async function listOfflineDrafts(params = {}) {
  const db = await openOfflineDb();
  const all = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return all
    .filter((d) => d.syncStatus !== "synced")
    .filter((d) => draftMatchesListParams(d, params))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function upsertOfflineDraft(patch) {
  const db = await openOfflineDb();
  const existing = patch.localId
    ? await getOfflineDraftByAnyId(patch.localId)
    : patch.serverId
      ? await getOfflineDraftByAnyId(patch.serverId)
      : null;

  const localId = existing?.localId || patch.localId || createLocalResponseId();
  const ts = nowIso();
  const draft = {
    ...existing,
    ...patch,
    localId,
    serverId: patch.serverId ?? existing?.serverId ?? null,
    answers: patch.answers ?? existing?.answers ?? {},
    category: patch.category ?? existing?.category ?? "",
    formId: patch.formId ?? existing?.formId ?? null,
    formTitle: patch.formTitle ?? existing?.formTitle ?? null,
    siteId: patch.siteId ?? existing?.siteId ?? null,
    subfolderId: patch.subfolderId ?? existing?.subfolderId ?? null,
    syncStatus: "pending",
    createdAt: existing?.createdAt || ts,
    updatedAt: ts,
  };

  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(draft);
  await txDone(tx);
  db.close();
  notifyQueueChanged();
  return draft;
}

export async function markOfflineDraftSynced(localId, serverId) {
  const draft = await getOfflineDraftByAnyId(localId);
  if (!draft) return;
  const db = await openOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  if (serverId) {
    tx.objectStore(STORE).put({
      ...draft,
      serverId,
      syncStatus: "synced",
      updatedAt: nowIso(),
    });
  } else {
    tx.objectStore(STORE).delete(draft.localId);
  }
  await txDone(tx);
  db.close();
  notifyQueueChanged();
}

export async function removeOfflineDraft(localId) {
  const db = await openOfflineDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(localId);
  await txDone(tx);
  db.close();
  notifyQueueChanged();
}

export function mergeDraftsIntoListPayload(payload, params = {}) {
  if (!payload || typeof payload !== "object") return payload;
  return listOfflineDrafts(params).then((drafts) => {
    if (!drafts.length) return payload;
    const rows = Array.isArray(payload.data) ? [...payload.data] : [];
    const seen = new Set(rows.map((r) => r.id || r._id));
    for (const draft of drafts) {
      const row = draftToListRow(draft);
      const id = row.id || row._id;
      if (seen.has(id)) continue;
      rows.unshift(row);
      seen.add(id);
    }
    return { ...payload, data: rows };
  });
}
