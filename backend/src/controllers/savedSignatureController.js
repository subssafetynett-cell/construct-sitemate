const crypto = require("crypto");
const asyncHandler = require("express-async-handler");
const prisma = require("../prismaClient");

const MIN_SIGNATURES = 1;
const MAX_SIGNATURES = 20;
const MAX_LABEL_LENGTH = 200;
const MAX_IMAGE_LENGTH = 800_000;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidImageValue(image) {
  if (!image) return true;
  if (typeof image !== "string") return false;
  return (
    image.startsWith("data:image") ||
    image.startsWith("http://") ||
    image.startsWith("https://")
  );
}

function normalizeSignatureEntry(row, index) {
  if (!row || typeof row !== "object") {
    throw new Error("Each signature must be an object");
  }
  const id =
    typeof row.id === "string" && UUID_REGEX.test(row.id)
      ? row.id
      : crypto.randomUUID();
  const label = String(row.label ?? "")
    .trim()
    .slice(0, MAX_LABEL_LENGTH);
  let image = row.image ?? null;
  if (image === "") image = null;
  if (image != null) {
    if (!isValidImageValue(image)) {
      throw new Error("Signature image must be a data URL or http(s) URL");
    }
    if (image.length > MAX_IMAGE_LENGTH) {
      throw new Error("Signature image is too large");
    }
  }
  return { id, label, image, sortOrder: index };
}

function toClientSignature(row) {
  return {
    id: row.id,
    label: row.label || "",
    image: row.image,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function respondToSavedSignatureDbError(res, err, action) {
  if (err?.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Duplicate signature id. Refresh the page and try again.",
    });
  }
  console.error(`Saved signature ${action} error:`, err);
  const message =
    action === "load"
      ? "Could not load saved signatures. Please try again."
      : "Could not save signatures. Please try again.";
  return res.status(500).json({ success: false, message });
}

exports.listSavedSignatures = asyncHandler(async (req, res) => {
  try {
    const rows = await prisma.savedSignature.findMany({
      where: { userId: req.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json({
      success: true,
      signatures: rows.map(toClientSignature),
    });
  } catch (err) {
    return respondToSavedSignatureDbError(res, err, "load");
  }
});

exports.syncSavedSignatures = asyncHandler(async (req, res) => {
  const { signatures } = req.body ?? {};
  if (!Array.isArray(signatures)) {
    return res.status(400).json({
      success: false,
      message: "signatures must be an array",
    });
  }
  if (signatures.length < MIN_SIGNATURES) {
    return res.status(400).json({
      success: false,
      message: "At least one saved signature is required",
    });
  }
  if (signatures.length > MAX_SIGNATURES) {
    return res.status(400).json({
      success: false,
      message: `Maximum ${MAX_SIGNATURES} saved signatures allowed`,
    });
  }

  let normalized;
  try {
    normalized = signatures.map(normalizeSignatureEntry);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: err.message || "Invalid signature data",
    });
  }

  const userId = req.user.id;
  let rows;
  try {
    await prisma.$transaction([
      prisma.savedSignature.deleteMany({ where: { userId } }),
      prisma.savedSignature.createMany({
        data: normalized.map((entry) => ({
          id: entry.id,
          userId,
          label: entry.label,
          image: entry.image,
          sortOrder: entry.sortOrder,
        })),
      }),
    ]);

    rows = await prisma.savedSignature.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (err) {
    return respondToSavedSignatureDbError(res, err, "save");
  }

  res.json({
    success: true,
    signatures: rows.map(toClientSignature),
  });
});
