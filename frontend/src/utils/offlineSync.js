/**
 * Flush IndexedDB offline write queue when the device is online.
 * Resolves local form/response IDs to server IDs during sync.
 */
import api from "../services/api";
import {
  listOfflineQueue,
  removeOfflineQueueItem,
  deserializeRequestBody,
  countOfflineQueue,
  subscribeOfflineQueue,
  loadAllIdRemaps,
  getIdRemap,
  updateOfflineQueueItem,
  isOfflineLocalId,
  OFFLINE_SYNC_TAG,
} from "./offlineStore";
import {
  recordSyncedTemplateForm,
  recordSyncedFormResponse,
} from "./offlineFormWrite";
import { markOfflineDraftSynced, removeOfflineDraft } from "./offlineFormDrafts";

let flushing = false;
let started = false;

function remapUrl(url, formMap, responseMap) {
  let out = String(url || "");
  for (const [local, server] of Object.entries(formMap)) {
    out = out.replace(local, server);
  }
  for (const [local, server] of Object.entries(responseMap)) {
    out = out.replace(local, server);
  }
  return out;
}

async function resolveRemapMaps() {
  const stored = await loadAllIdRemaps();
  return { formMap: { ...stored.formMap }, responseMap: { ...stored.responseMap } };
}

async function flushOneItem(item, formMap, responseMap) {
  if (item.dependsOnLocalFormId && isOfflineLocalId(item.dependsOnLocalFormId)) {
    const resolved =
      formMap[item.dependsOnLocalFormId] || (await getIdRemap(item.dependsOnLocalFormId));
    if (!resolved) return { status: "blocked" };
    formMap[item.dependsOnLocalFormId] = resolved;
  }

  if (item.localFormId && isOfflineLocalId(item.localFormId) && item.kind === "formTemplate") {
    // template items processed in their own pass
  }

  let url = remapUrl(item.url, formMap, responseMap);
  let data = deserializeRequestBody(item.body);

  if (item.kind === "formResponse" && item.formId && isOfflineLocalId(item.formId)) {
    const resolved = formMap[item.formId] || (await getIdRemap(item.formId));
    if (!resolved) return { status: "blocked" };
    formMap[item.formId] = resolved;
    url = url.replace(item.formId, resolved);
  }

  const headers = { ...(item.headers || {}) };
  if (data instanceof FormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }

  const response = await api.request({
    method: item.method || "post",
    url,
    data,
    headers,
    params: item.params,
    timeout: item.timeout,
    __offlineReplay: true,
  });

  const resData = response?.data;

  if (item.kind === "formTemplate" && item.localFormId) {
    const serverFormId = resData?.form?.id || resData?.form?._id || resData?.data?.id;
    if (serverFormId) {
      formMap[item.localFormId] = serverFormId;
      await recordSyncedTemplateForm(item.localFormId, serverFormId, item.formTitle);
      // Rewrite pending response queue items that depend on this form
      const pending = await listOfflineQueue();
      for (const q of pending) {
        if (q.formId === item.localFormId || q.dependsOnLocalFormId === item.localFormId) {
          await updateOfflineQueueItem(q.id, {
            url: remapUrl(q.url, { [item.localFormId]: serverFormId }, {}),
            formId: serverFormId,
            dependsOnLocalFormId: null,
          });
        }
      }
    }
  }

  if (item.kind === "formResponse" && item.localResponseId) {
    const serverId =
      resData?.data?.id ||
      resData?.data?._id ||
      (item.method === "put" ? url.split("/").pop() : null);
    if (serverId && !isOfflineLocalId(serverId)) {
      responseMap[item.localResponseId] = serverId;
      await recordSyncedFormResponse(item.localResponseId, serverId);
    } else if (item.method === "put" && !isOfflineLocalId(url)) {
      await markOfflineDraftSynced(item.localResponseId, url.split("/").pop());
    }
  }

  await removeOfflineQueueItem(item.id);
  return { status: "flushed" };
}

export async function flushOfflineQueue() {
  if (flushing) return { flushed: 0, remaining: await countOfflineQueue() };
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { flushed: 0, remaining: await countOfflineQueue() };
  }

  flushing = true;
  let flushed = 0;
  try {
    const { formMap, responseMap } = await resolveRemapMaps();
    let items = await listOfflineQueue();
    let passes = 0;
    const maxPasses = items.length + 2;

    while (items.length > 0 && passes < maxPasses) {
      passes += 1;
      let progressed = false;

      // Templates before responses
      const ordered = [
        ...items.filter((i) => i.kind === "formTemplate"),
        ...items.filter((i) => i.kind !== "formTemplate"),
      ];

      for (const item of ordered) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) break;
        try {
          const result = await flushOneItem(item, formMap, responseMap);
          if (result.status === "flushed") {
            flushed += 1;
            progressed = true;
          }
        } catch (err) {
          const status = err?.response?.status;
          if (status === 401 || status === 403) {
            throw err;
          }
          console.warn("[offline] sync failed for queue item", item.id, err?.message || err);
        }
      }

      items = await listOfflineQueue();
      if (!progressed) break;
    }
  } catch (err) {
    const status = err?.response?.status;
    if (status !== 401 && status !== 403) {
      console.warn("[offline] flush aborted", err?.message || err);
    }
  } finally {
    flushing = false;
  }

  return { flushed, remaining: await countOfflineQueue() };
}

function onSwMessage(event) {
  if (event?.data?.type === "FLUSH_OFFLINE_QUEUE") {
    flushOfflineQueue().catch(() => {});
  }
}

/** Call once from app bootstrap. */
export function startOfflineSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  const tryFlush = () => {
    flushOfflineQueue().catch(() => {});
  };

  window.addEventListener("online", tryFlush);
  window.setInterval(tryFlush, 60_000);
  window.setTimeout(tryFlush, 2_000);

  subscribeOfflineQueue(() => {
    if (navigator.onLine) tryFlush();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", onSwMessage);
  }
}

export { OFFLINE_SYNC_TAG };
