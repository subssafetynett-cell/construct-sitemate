import { prepareImagesForPdfExport, prepareImagesForSave } from "./compressImage";

/** @typedef {{ src: string, description: string }} ImageEvidenceEntry */

/**
 * Normalize a single image evidence value (legacy string or { src, description }).
 * @returns {ImageEvidenceEntry | null}
 */
export function normalizeImageEvidenceEntry(img) {
    if (!img) return null;
    if (typeof img === "string") {
        const src = img.trim();
        return src ? { src, description: "" } : null;
    }
    if (typeof img === "object") {
        const src = String(img.src || img.url || "").trim();
        if (!src) return null;
        return {
            src,
            description: String(img.description || "").trim(),
        };
    }
    return null;
}

/** @returns {ImageEvidenceEntry[]} */
export function normalizeImageEvidenceList(images) {
    if (!Array.isArray(images)) return [];
    return images.map(normalizeImageEvidenceEntry).filter(Boolean);
}

export function getImageEvidenceSrc(entry) {
    if (typeof entry === "string") return entry;
    return entry?.src || "";
}

export function getImageEvidenceDescription(entry) {
    if (!entry || typeof entry === "string") return "";
    return String(entry.description || "").trim();
}

export function createImageEvidenceEntry(src, description = "") {
    return { src, description: String(description || "").trim() };
}

/** Persist as a string when there is no description (backward compatible). */
export function serializeImageEvidenceEntry(entry) {
    const normalized = normalizeImageEvidenceEntry(entry);
    if (!normalized) return null;
    const { src, description } = normalized;
    return description ? { src, description } : src;
}

export async function prepareImageEvidenceForSave(images = []) {
    const entries = normalizeImageEvidenceList(images);
    if (!entries.length) return [];
    const savedSrc = await prepareImagesForSave(entries.map((e) => e.src));
    return savedSrc
        .map((src, i) =>
            serializeImageEvidenceEntry({
                src,
                description: entries[i]?.description || "",
            })
        )
        .filter(Boolean);
}

export async function prepareImageEvidenceForPdfExport(images = []) {
    const entries = normalizeImageEvidenceList(images);
    if (!entries.length) return [];
    const preparedSrc = await prepareImagesForPdfExport(entries.map((e) => e.src));
    return preparedSrc.map((src, i) =>
        serializeImageEvidenceEntry({
            src,
            description: entries[i]?.description || "",
        })
    );
}

/** Legacy helper: src strings only (compression pipelines). */
export function extractImageEvidenceSrcList(images) {
    return normalizeImageEvidenceList(images).map((e) => e.src);
}
