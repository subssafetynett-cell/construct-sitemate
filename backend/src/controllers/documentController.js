const asyncHandler = require('express-async-handler');
const { Readable } = require('stream');
const prisma = require("../prismaClient");
const {
  extensionFromName,
  normalizeDocumentType,
  isAllowedUpload,
  isRawCloudinaryResource,
  sanitizePublicIdBase,
} = require('../utils/documentFileTypes');
const { destroyCloudinaryAsset } = require('../utils/cloudinaryDocument');
const { userCanAccessSite } = require('../utils/siteAccess');

// Upload a document
exports.uploadDocument = asyncHandler(async (req, res) => {
    const { title, version, validFrom, validUntil, tags, siteId, category } = req.body;

    if (!siteId) {
        return res.status(400).json({ success: false, message: "Site ID is required" });
    }

    if (!(await userCanAccessSite(prisma, req.user, siteId))) {
        return res.status(403).json({ success: false, message: "You do not have access to this site." });
    }

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    if (!isAllowedUpload(req.file)) {
        return res.status(400).json({
            success: false,
            message: "File type not supported. Use PDF, Word, Excel, PowerPoint, images (PNG, JPEG), or text files.",
        });
    }

    const { cloudinary } = require('../config/cloudinary');
    const ext = extensionFromName(req.file.originalname);
    const isRaw = isRawCloudinaryResource(ext);
    const docType = normalizeDocumentType(req.file);
    const publicIdBase = `${sanitizePublicIdBase(req.file.originalname)}_${Date.now()}`;

    const uploadStream = cloudinary.uploader.upload_stream(
        {
            folder: 'safetyapp_uploads',
            resource_type: isRaw ? 'raw' : 'auto',
            public_id: isRaw ? `${publicIdBase}.${ext}` : publicIdBase,
            use_filename: false,
            unique_filename: false,
            overwrite: false,
        },
        async (err, result) => {
            if (err) {
                console.error("Cloudinary upload stream error:", err);
                return res.status(500).json({ success: false, message: "Upload failed" });
            }

            try {
                const fileData = {
                    title,
                    version: version || "v1.0",
                    validFrom,
                    validUntil,
                    tags: tags || "",
                    siteId,
                    category: category || 'uploads',
                    uploadedById: req.user.id,
                    url: result.secure_url,
                    type: docType,
                    size: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
                };

                const document = await prisma.siteDocument.create({
                    data: fileData,
                });

                res.status(201).json({ success: true, document });
            } catch (dbError) {
                console.error("Database save error:", dbError);
                res.status(500).json({ success: false, message: "Upload failed", error: dbError.message });
            }
        }
    );

    Readable.from(req.file.buffer).pipe(uploadStream);
});

// Get documents for a specific site and module (category)
exports.getDocuments = asyncHandler(async (req, res) => {
    const { siteId, category } = req.query;

    if (!siteId) {
        return res.status(400).json({ success: false, message: "Site ID is required" });
    }

    if (!(await userCanAccessSite(prisma, req.user, siteId))) {
        return res.status(403).json({ success: false, message: "You do not have access to this site." });
    }

    const where = {
        siteId,
    };

    if (category) {
        where.category = category;
    }

    const documents = await prisma.siteDocument.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            uploadedBy: {
                select: { firstName: true, lastName: true },
            },
        },
    });

    res.json({ success: true, documents });
});

// Get counts per module for a site (User specific)
exports.getModuleCounts = asyncHandler(async (req, res) => {
    const { siteId } = req.query;

    if (!siteId) {
        return res.status(400).json({ success: false, message: "Site ID is required" });
    }

    if (!(await userCanAccessSite(prisma, req.user, siteId))) {
        return res.status(403).json({ success: false, message: "You do not have access to this site." });
    }

    const counts = await prisma.siteDocument.groupBy({
        by: ['category'],
        where: {
            siteId,
        },
        _count: {
            category: true,
        },
    });

    const countMap = {};
    counts.forEach((c) => {
        countMap[c.category] = c._count.category;
    });

    res.json({ success: true, counts: countMap });
});

exports.deleteDocument = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const doc = await prisma.siteDocument.findUnique({ where: { id } });

    if (!doc) {
        return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (!(await userCanAccessSite(prisma, req.user, doc.siteId))) {
        return res.status(403).json({ success: false, message: "You do not have access to this site." });
    }

    if (doc.url) {
        await destroyCloudinaryAsset(doc.url);
    }

    await prisma.siteDocument.delete({ where: { id } });

    res.json({ success: true, message: "Document deleted" });
});
