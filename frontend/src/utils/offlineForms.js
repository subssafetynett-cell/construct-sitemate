/**
 * Offline form responses: local drafts with stable IDs + sync queue coalescing.
 * Create / edit / submit work without network; flush remaps offline-* → server ids.
 */

import {
  openOfflineDb,
  txDone,
  STORE_DRAFTS,
  STORE_QUEUE,
  notifyQueueChanged,
  getApiGetCache,
  putApiGetCache,
  buildApiCacheKey,
  isBrowserOffline,
} from "./offlineStore";
import { getStoredToken } from "./authSession";

export function isOfflineFormId(id) {
  return typeof id === "string" && id.startsWith("offline-");
}

export function createOfflineFormId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `offline-${crypto.randomUUID()}`;
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function currentUserHint() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user?.id || user?._id || "anon";
  } catch {
    return "anon";
  }
}

/**
 * Persist (or update) a form response draft and mark a single sync job for it.
 */
export async function upsertFormDraft({
  localId,
  serverId = null,
  formId = null,
  formTitle = null,
  answers = {},
  category = null,
  siteId = null,
  subfolderId = null,
  extras = {},
}) {
  const id = localId || serverId || createOfflineFormId();
  const now = Date.now();
  const db = await openOfflineDb();
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readonly");
    const req = tx.objectStore(STORE_DRAFTS).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });

  const draft = {
    localId: id,
    serverId: serverId || existing?.serverId || (isOfflineFormId(id) ? null : id),
    formId: formId || existing?.formId || null,
    formTitle: formTitle || existing?.formTitle || null,
    answers,
    category: category ?? existing?.category ?? null,
    siteId: siteId ?? existing?.siteId ?? null,
    subfolderId: subfolderId ?? existing?.subfolderId ?? null,
    extras: { ...(existing?.extras || {}), ...extras },
    userHint: currentUserHint(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    pendingSync: true,
  };

  const tx = db.transaction([STORE_DRAFTS, STORE_QUEUE], "readwrite");
  tx.objectStore(STORE_DRAFTS).put(draft);

  // Coalesce: one queued sync job per draft.
  const queueStore = tx.objectStore(STORE_QUEUE);
  const allQueue = await new Promise((resolve, reject) => {
    const req = queueStore.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  for (const row of allQueue) {
    if (row.kind === "formDraft" && row.localId === id) {
      queueStore.delete(row.id);
    }
  }
  queueStore.add({
    kind: "formDraft",
    localId: id,
    label: formTitle || category || "Form save",
    createdAt: now,
    status: "pending",
  });

  await txDone(tx);
  db.close();
  notifyQueueChanged();

  // Keep a per-id GET cache entry so reopen works offline.
  await cacheDraftAsGetResponse(draft);

  return draft;
}

async function cacheDraftAsGetResponse(draft) {
  try {
    const token = getStoredToken();
    const payload = {
      success: true,
      offlineDraft: true,
      data: draftToApiShape(draft),
    };
    const key = buildApiCacheKey({
      method: "get",
      url: `/forms/responses/${draft.localId}`,
      token,
    });
    await putApiGetCache(key, payload);
    if (draft.serverId && draft.serverId !== draft.localId) {
      const serverKey = buildApiCacheKey({
        method: "get",
        url: `/forms/responses/${draft.serverId}`,
        token,
      });
      await putApiGetCache(serverKey, payload);
    }
  } catch {
    /* ignore */
  }
}

export function draftToApiShape(draft) {
  return {
    id: draft.serverId || draft.localId,
    _id: draft.serverId || draft.localId,
    localId: draft.localId,
    formId: draft.formId,
    answers: draft.answers || {},
    category: draft.category,
    siteId: draft.siteId,
    subfolderId: draft.subfolderId,
    pendingSync: Boolean(draft.pendingSync),
    offlineDraft: true,
    updatedAt: draft.updatedAt
      ? new Date(draft.updatedAt).toISOString()
      : new Date().toISOString(),
    createdAt: draft.createdAt
      ? new Date(draft.createdAt).toISOString()
      : new Date().toISOString(),
    ...(draft.extras || {}),
  };
}

export async function getFormDraft(localOrServerId) {
  if (!localOrServerId) return null;
  try {
    const db = await openOfflineDb();
    const byKey = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const req = tx.objectStore(STORE_DRAFTS).get(localOrServerId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (byKey) {
      db.close();
      return byKey;
    }
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const req = tx.objectStore(STORE_DRAFTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return (
      all.find(
        (d) => d.serverId === localOrServerId || d.localId === localOrServerId
      ) || null
    );
  } catch {
    return null;
  }
}

export async function listFormDrafts({ pendingOnly = false } = {}) {
  try {
    const db = await openOfflineDb();
    const all = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_DRAFTS, "readonly");
      const req = tx.objectStore(STORE_DRAFTS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    db.close();
    const hint = currentUserHint();
    return all
      .filter((d) => !d.userHint || d.userHint === hint || hint === "anon")
      .filter((d) => (pendingOnly ? d.pendingSync : true))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export async function markFormDraftSynced(localId, serverId) {
  const db = await openOfflineDb();
  const draft = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_DRAFTS, "readonly");
    const req = tx.objectStore(STORE_DRAFTS).get(localId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!draft) {
    db.close();
    return;
  }
  const updated = {
    ...draft,
    serverId: serverId || draft.serverId,
    pendingSync: false,
    updatedAt: Date.now(),
  };
  const tx = db.transaction(STORE_DRAFTS, "readwrite");
  tx.objectStore(STORE_DRAFTS).put(updated);
  await txDone(tx);
  db.close();
  await cacheDraftAsGetResponse(updated);
  notifyQueueChanged();
}

export async function deleteFormDraft(localId) {
  const db = await openOfflineDb();
  const tx = db.transaction([STORE_DRAFTS, STORE_QUEUE], "readwrite");
  tx.objectStore(STORE_DRAFTS).delete(localId);
  const queueStore = tx.objectStore(STORE_QUEUE);
  const allQueue = await new Promise((resolve, reject) => {
    const req = queueStore.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  for (const row of allQueue) {
    if (row.kind === "formDraft" && row.localId === localId) {
      queueStore.delete(row.id);
    }
  }
  await txDone(tx);
  db.close();
  notifyQueueChanged();
}

/**
 * Handle a create/update form response write while offline (or on network failure).
 * Returns a synthetic API-shaped payload.
 */
export async function queueFormResponseWrite({
  method,
  url,
  body,
}) {
  const path = String(url || "").split("?")[0];
  const json = body?.kind === "json" ? body.value : body;
  const answers = json?.answers || {};
  const category = json?.category ?? null;
  const siteId = json?.siteId ?? answers?.siteId ?? null;
  const subfolderId = json?.subfolderId ?? answers?.subfolderId ?? null;
  const formTitle = json?.formTitle || answers?.formTitle || null;

  const putMatch = path.match(/\/forms\/responses\/([^/]+)\/?$/);
  const postMatch = path.match(/\/forms\/([^/]+)\/responses\/?$/);

  if (method === "put" && putMatch) {
    const id = decodeURIComponent(putMatch[1]);
    const existing = await getFormDraft(id);
    const localId = existing?.localId || (isOfflineFormId(id) ? id : id);
    const draft = await upsertFormDraft({
      localId,
      serverId: existing?.serverId || (isOfflineFormId(id) ? null : id),
      formId: existing?.formId || json?.formId || null,
      formTitle: formTitle || existing?.formTitle,
      answers,
      category,
      siteId,
      subfolderId,
    });
    return {
      success: true,
      offlineQueued: true,
      message: "Saved offline — will sync when you're back online.",
      data: draftToApiShape(draft),
    };
  }

  if (method === "post" && postMatch) {
    const formId = decodeURIComponent(postMatch[1]);
    const localId = createOfflineFormId();
    const draft = await upsertFormDraft({
      localId,
      serverId: null,
      formId,
      formTitle,
      answers,
      category,
      siteId,
      subfolderId,
    });
    return {
      success: true,
      offlineQueued: true,
      message: "Saved offline — will sync when you're back online.",
      data: draftToApiShape(draft),
    };
  }

  throw new Error("Unsupported offline form write URL");
}

/** Merge pending offline drafts into a forms/responses list payload. */
export async function mergeFormDraftsIntoListPayload(payload, params = {}) {
  const drafts = await listFormDrafts({ pendingOnly: false });
  if (!drafts.length) return payload;

  const category = params?.category != null ? String(params.category) : null;
  const siteId = params?.siteId != null ? String(params.siteId) : null;
  const subfolderId =
    params?.subfolderId != null ? String(params.subfolderId) : null;

  const filtered = drafts.filter((d) => {
    if (siteId && String(d.siteId || "") !== siteId) return false;
    if (subfolderId && String(d.subfolderId || "") !== subfolderId) return false;
    if (category) {
      const cats = category.split(",").map((c) => c.trim()).filter(Boolean);
      if (cats.length && d.category && !cats.includes(String(d.category))) {
        // Allow pending drafts without category match when list is broad
        const wantsEmpty = cats.includes("__empty__");
        if (!wantsEmpty && !cats.some((c) => String(d.category).includes(c))) {
          return false;
        }
      }
    }
    return true;
  });

  const rows = filtered.map(draftToApiShape);
  if (!payload || typeof payload !== "object") {
    return { success: true, data: rows, offlineMerged: true };
  }

  const data = Array.isArray(payload.data) ? [...payload.data] : [];
  const seen = new Set(
    data.map((r) => String(r?.id || r?._id || "")).filter(Boolean)
  );
  for (const row of rows) {
    const key = String(row.id);
    if (seen.has(key)) {
      const idx = data.findIndex((r) => String(r?.id || r?._id) === key);
      if (idx >= 0) data[idx] = { ...data[idx], ...row };
    } else {
      data.unshift(row);
      seen.add(key);
    }
  }

  return {
    ...payload,
    success: true,
    data,
    offlineMerged: true,
  };
}

/** Resolve GET /forms/responses/:id from draft store when offline. */
export async function resolveFormResponseGet(id) {
  const draft = await getFormDraft(id);
  if (!draft) return null;
  return {
    success: true,
    offlineDraft: true,
    data: draftToApiShape(draft),
  };
}

/** Remember form title → id from successful GET /forms payloads. */
export async function cacheFormTemplatesFromPayload(payload) {
  try {
    const list = Array.isArray(payload?.data)
      ? payload.data
      : payload?.form
        ? [payload.form]
        : [];
    if (!list.length) return;
    const token = getStoredToken();
    for (const form of list) {
      const title = form?.title;
      const id = form?.id || form?._id;
      if (!title || !id) continue;
      const key = buildApiCacheKey({
        method: "get",
        url: "/forms",
        params: { title },
        token,
      });
      await putApiGetCache(key, {
        success: true,
        data: [form],
      });
    }
  } catch {
    /* ignore */
  }
}

export async function resolveFormIdFromCache(formTitle) {
  if (!formTitle) return null;
  const token = getStoredToken();
  const key = buildApiCacheKey({
    method: "get",
    url: "/forms",
    params: { title: formTitle },
    token,
  });
  const cached = await getApiGetCache(key);
  const list = Array.isArray(cached?.data) ? cached.data : [];
  const hit = list.find((f) => f.title === formTitle);
  return hit?.id || hit?._id || null;
}

export { isBrowserOffline };
