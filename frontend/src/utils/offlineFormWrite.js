/**
 * Queue form response writes offline with local draft IDs and coalesced sync.
 */
import {
  serializeRequestBody,
  upsertOfflineFormQueueItem,
  upsertOfflineTemplateQueueItem,
  parseFormResponseWrite,
  isFormTemplateCreateUrl,
  isOfflineLocalId,
  createLocalResponseId,
  createLocalFormId,
  putOfflineTemplateForm,
  putIdRemap,
  shouldQueueWriteUrl,
} from "./offlineStore.js";
import {
  upsertOfflineDraft,
  getOfflineDraftByAnyId,
  draftToDetailRow,
} from "./offlineFormDrafts.js";

function bodyJson(serialized) {
  if (!serialized || serialized.kind !== "json") return {};
  return serialized.value || {};
}

function pickSerializableHeaders(headers) {
  if (!headers || typeof headers !== "object") return {};
  const out = {};
  for (const key of ["Authorization", "authorization", "X-Acting-Client-Id", "x-acting-client-id"]) {
    if (headers[key]) out[key] = headers[key];
  }
  return out;
}

export async function queueOfflineTemplateFormCreate({ url, data, headers, timeout }) {
  const body = await serializeRequestBody(data);
  const payload = bodyJson(body);
  const title = payload.title;
  if (!title) throw new Error("Template form title required");

  const localFormId = createLocalFormId();
  await putOfflineTemplateForm(title, localFormId, { pending: true });

  const queueId = await upsertOfflineTemplateQueueItem({
    kind: "formTemplate",
    method: "post",
    url,
    body,
    headers: pickSerializableHeaders(headers),
    timeout,
    localFormId,
    formTitle: title,
    label: `Form template: ${title}`,
  });

  return {
    success: true,
    offlineQueued: true,
    queueId,
    form: {
      id: localFormId,
      _id: localFormId,
      title,
      pendingSync: true,
    },
  };
}

/**
 * Queue a form response create/update. Returns API-shaped payload for axios adapter.
 */
export async function queueOfflineFormResponseWrite({
  method,
  url,
  data,
  headers,
  timeout,
}) {
  const parsed = parseFormResponseWrite(url, method);
  if (!parsed) throw new Error("Not a form response write");

  const body = await serializeRequestBody(data);
  const payload = bodyJson(body);
  const answers = payload.answers || {};
  const category = payload.category || "";
  const siteId = payload.siteId ?? answers.siteId ?? null;
  const subfolderId = payload.subfolderId ?? answers.subfolderId ?? null;

  let draft = null;
  let localResponseId = null;
  let queueMethod = method;
  let queueUrl = url;

  if (parsed.type === "update") {
    draft = await getOfflineDraftByAnyId(parsed.responseId);
    if (draft) {
      localResponseId = draft.localId;
      if (draft.serverId) {
        queueMethod = "put";
        queueUrl = `/forms/responses/${draft.serverId}`;
      } else {
        queueMethod = "post";
        queueUrl = `/forms/${draft.formId}/responses`;
      }
    } else if (isOfflineLocalId(parsed.responseId)) {
      throw new Error("Offline draft not found");
    } else if (!isOfflineLocalId(parsed.responseId)) {
      draft = await getOfflineDraftByAnyId(parsed.responseId);
      if (!draft) {
        draft = await upsertOfflineDraft({
          serverId: parsed.responseId,
          formId: payload.formId || null,
          answers,
          category,
          siteId,
          subfolderId,
        });
      } else {
        draft = await upsertOfflineDraft({
          localId: draft.localId,
          serverId: parsed.responseId,
          formId: draft.formId || payload.formId || null,
          answers,
          category,
          siteId,
          subfolderId,
        });
      }
      localResponseId = draft.localId;
      queueMethod = "put";
      queueUrl = `/forms/responses/${parsed.responseId}`;
    }
  } else {
    const formId = parsed.formId;
    draft = await upsertOfflineDraft({
      formId,
      answers,
      category,
      siteId,
      subfolderId,
    });
    localResponseId = draft.localId;
    queueMethod = "post";
    queueUrl = `/forms/${formId}/responses`;
  }

  if (!draft) {
    draft = await upsertOfflineDraft({
      localId: localResponseId || createLocalResponseId(),
      formId: parsed.formId || payload.formId,
      answers,
      category,
      siteId,
      subfolderId,
    });
    localResponseId = draft.localId;
  } else {
    draft = await upsertOfflineDraft({
      localId: localResponseId,
      serverId: draft.serverId,
      formId: draft.formId || parsed.formId,
      answers,
      category,
      siteId,
      subfolderId,
    });
  }

  const queueId = await upsertOfflineFormQueueItem({
    kind: "formResponse",
    method: queueMethod,
    url: queueUrl,
    body,
    headers: pickSerializableHeaders(headers),
    timeout,
    localResponseId: draft.localId,
    formId: draft.formId,
    dependsOnLocalFormId: isOfflineLocalId(draft.formId) ? draft.formId : null,
    label: "Form save",
  });

  return {
    success: true,
    offlineQueued: true,
    queueId,
    message: "Saved offline — will sync when you're back online.",
    data: draftToDetailRow(draft),
  };
}

export async function queueOfflineWriteFromConfig(config) {
  const method = (config.method || "post").toLowerCase();
  const url = config.url || "";

  if (!shouldQueueWriteUrl(url, method)) {
    throw new Error(`Cannot queue offline: ${method.toUpperCase()} ${url}`);
  }

  if (isFormTemplateCreateUrl(url, method)) {
    return queueOfflineTemplateFormCreate({
      url,
      data: config.data,
      headers: config.headers,
      timeout: config.timeout,
    });
  }

  if (parseFormResponseWrite(url, method)) {
    return queueOfflineFormResponseWrite({
      method,
      url,
      data: config.data,
      headers: config.headers,
      timeout: config.timeout,
    });
  }

  const body = await serializeRequestBody(config.data);
  const { enqueueOfflineWrite } = await import("./offlineStore.js");
  const queueId = await enqueueOfflineWrite({
    kind: "documentUpload",
    method,
    url,
    body,
    headers: pickSerializableHeaders(config.headers),
    timeout: config.timeout,
    label: /documents\/upload/i.test(url) ? "Document upload" : "Write",
  });

  return {
    success: true,
    offlineQueued: true,
    queueId,
    message: "Saved offline — will sync when you're back online.",
    data: null,
  };
}

/** After server assigns ids during sync. */
export async function recordSyncedTemplateForm(localFormId, serverFormId, title) {
  await putIdRemap(localFormId, serverFormId, "form");
  if (title) await putOfflineTemplateForm(title, serverFormId, { pending: false });
}

export async function recordSyncedFormResponse(localResponseId, serverResponseId) {
  await putIdRemap(localResponseId, serverResponseId, "response");
  const draft = await getOfflineDraftByAnyId(localResponseId);
  if (draft) {
    const { markOfflineDraftSynced } = await import("./offlineFormDrafts.js");
    await markOfflineDraftSynced(localResponseId, serverResponseId);
  }
}
