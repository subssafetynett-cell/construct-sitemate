/**
 * Service worker background sync — replays queued writes when the app is closed.
 * Loaded via workbox importScripts from the generated service worker.
 */
const DB_NAME = "sitemate-offline";
const DB_VERSION = 2;
const STORE_QUEUE = "offlineQueue";
const STORE_ID_MAP = "idMap";
const SYNC_TAG = "sitemate-offline-flush";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function deserializeBody(serialized) {
  if (!serialized || serialized.kind === "empty") return undefined;
  if (serialized.kind === "text") return serialized.value;
  if (serialized.kind === "json") return serialized.value;
  if (serialized.kind === "formData") {
    const fd = new FormData();
    for (const part of serialized.parts || []) {
      if (part.kind === "file") {
        const blob = new Blob([part.buffer], { type: part.fileType || "application/octet-stream" });
        fd.append(part.name, blob, part.fileName || "file");
      } else {
        fd.append(part.name, part.value);
      }
    }
    return fd;
  }
  return undefined;
}

function isLocalId(id) {
  return /^offline-(res|form)-/i.test(String(id || ""));
}

async function loadIdMaps(db) {
  const rows = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ID_MAP, "readonly");
    const req = tx.objectStore(STORE_ID_MAP).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
  const formMap = {};
  const responseMap = {};
  for (const row of rows) {
    if (row.kind === "form") formMap[row.localId] = row.serverId;
    else responseMap[row.localId] = row.serverId;
  }
  return { formMap, responseMap };
}

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

async function listQueue(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_QUEUE, "readonly");
    const req = tx.objectStore(STORE_QUEUE).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)));
    req.onerror = () => reject(req.error);
  });
}

async function removeQueueItem(db, id) {
  const tx = db.transaction(STORE_QUEUE, "readwrite");
  tx.objectStore(STORE_QUEUE).delete(id);
  await txDone(tx);
}

async function notifyClients() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
  }
}

async function flushInServiceWorker() {
  const db = await openDb();
  try {
    const { formMap, responseMap } = await loadIdMaps(db);
    const items = await listQueue(db);
    const origin = self.location.origin;

    const ordered = [
      ...items.filter((i) => i.kind === "formTemplate"),
      ...items.filter((i) => i.kind !== "formTemplate"),
    ];

    for (const item of ordered) {
      if (item.dependsOnLocalFormId && isLocalId(item.dependsOnLocalFormId) && !formMap[item.dependsOnLocalFormId]) {
        continue;
      }
      if (item.formId && isLocalId(item.formId) && !formMap[item.formId]) {
        continue;
      }

      const url = `${origin}/api${remapUrl(item.url, formMap, responseMap)}`;
      const headers = { ...(item.headers || {}), "Content-Type": "application/json" };
      const body = deserializeBody(item.body);
      const init = {
        method: (item.method || "POST").toUpperCase(),
        headers,
        credentials: "include",
      };
      if (body instanceof FormData) {
        delete init.headers["Content-Type"];
        init.body = body;
      } else if (body !== undefined) {
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) break;
        continue;
      }

      let json = null;
      try {
        json = await res.json();
      } catch {
        /* ignore */
      }

      if (item.kind === "formTemplate" && item.localFormId) {
        const serverId = json?.form?.id || json?.form?._id;
        if (serverId) formMap[item.localFormId] = serverId;
      }
      if (item.kind === "formResponse" && item.localResponseId) {
        const serverId = json?.data?.id || json?.data?._id;
        if (serverId) responseMap[item.localResponseId] = serverId;
      }

      await removeQueueItem(db, item.id);
    }
  } finally {
    db.close();
  }

  await notifyClients();
}

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        if (clients.length > 0) {
          return notifyClients();
        }
        return flushInServiceWorker();
      })
    );
  }
});
