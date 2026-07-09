/**
 * Flush IndexedDB offline write queue when the device is online.
 * Form drafts (create/edit) are posted/put with remapped offline IDs.
 */
import api from "../services/api";
import {
  listOfflineQueue,
  removeOfflineQueueItem,
  deserializeRequestBody,
  countOfflineQueue,
  subscribeOfflineQueue,
  isBrowserOffline,
} from "./offlineStore";
import {
  getFormDraft,
  markFormDraftSynced,
  isOfflineFormId,
  resolveFormIdFromCache,
} from "./offlineForms";

let flushing = false;
let started = false;

async function flushFormDraft(item) {
  const draft = await getFormDraft(item.localId);
  if (!draft) {
    await removeOfflineQueueItem(item.id);
    return;
  }

  let formId = draft.formId;
  if (!formId && draft.formTitle) {
    formId = await resolveFormIdFromCache(draft.formTitle);
  }
  if (!formId && draft.formTitle) {
    // Online: ensure template exists
    const { getOrCreateTemplateForm } = await import("../services/formUtils");
    formId = await getOrCreateTemplateForm(draft.formTitle);
  }
  if (!formId) {
    throw new Error("Missing formId for offline draft — open this form type once online first");
  }

  const body = {
    answers: draft.answers || {},
    category: draft.category,
  };
  if (draft.siteId) body.siteId = String(draft.siteId).trim();
  if (draft.subfolderId) body.subfolderId = String(draft.subfolderId).trim();

  const serverId = draft.serverId && !isOfflineFormId(draft.serverId) ? draft.serverId : null;
  let res;
  if (serverId) {
    res = await api.put(`/forms/responses/${serverId}`, body, {
      __offlineReplay: true,
    });
  } else {
    res = await api.post(`/forms/${formId}/responses`, body, {
      __offlineReplay: true,
    });
  }

  const saved = res?.data?.data;
  const newServerId = saved?.id || saved?._id || serverId;
  await markFormDraftSynced(draft.localId, newServerId);
  await removeOfflineQueueItem(item.id);

  // Remap URL if the UI is still on an offline id
  if (
    typeof window !== "undefined" &&
    isOfflineFormId(draft.localId) &&
    newServerId &&
    window.location.pathname.includes(draft.localId)
  ) {
    try {
      const next = window.location.pathname.replace(draft.localId, newServerId);
      window.history.replaceState(null, "", `${next}${window.location.search}`);
    } catch {
      /* ignore */
    }
  }
}

async function flushGenericWrite(item) {
  const data = deserializeRequestBody(item.body);
  const headers = { ...(item.headers || {}) };
  if (data instanceof FormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }
  await api.request({
    method: item.method || "post",
    url: item.url,
    data,
    headers,
    params: item.params,
    timeout: item.timeout,
    __offlineReplay: true,
  });
  await removeOfflineQueueItem(item.id);
}

export async function flushOfflineQueue() {
  if (flushing) return { flushed: 0, remaining: await countOfflineQueue() };
  if (isBrowserOffline()) {
    return { flushed: 0, remaining: await countOfflineQueue() };
  }

  flushing = true;
  let flushed = 0;
  try {
    const items = await listOfflineQueue();
    for (const item of items) {
      if (isBrowserOffline()) break;
      try {
        if (item.kind === "formDraft") {
          await flushFormDraft(item);
        } else {
          await flushGenericWrite(item);
        }
        flushed += 1;
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) break;
        console.warn("[offline] sync failed for queue item", item.id, err?.message || err);
        break;
      }
    }
  } finally {
    flushing = false;
  }

  return { flushed, remaining: await countOfflineQueue() };
}

/** Call once from app bootstrap. */
export function startOfflineSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  const tryFlush = () => {
    flushOfflineQueue().catch(() => {});
  };

  window.addEventListener("online", tryFlush);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryFlush();
  });
  window.setInterval(tryFlush, 30_000);
  window.setTimeout(tryFlush, 1_500);

  // Background Sync when supported (Chrome/Android)
  if ("serviceWorker" in navigator && "SyncManager" in window) {
    navigator.serviceWorker.ready
      .then((reg) => reg.sync.register("sitemate-offline-sync"))
      .catch(() => {});
  }

  subscribeOfflineQueue(() => {
    if (!isBrowserOffline()) tryFlush();
  });
}
