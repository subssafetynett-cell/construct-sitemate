const express = require("express");
const controller = require("../controllers/nonconformanceController");
const { requireAuth, requireRole } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.post("/", requireAuth, controller.create);
router.get("/", requireAuth, controller.list);
router.get("/:id/history", requireAuth, controller.history);
router.get(
  "/:id/assignable-users",
  requireAuth,
  requireRole(["superadmin", "company_admin"]),
  controller.assignableUsers
);
router.patch(
  "/:id/reassign",
  requireAuth,
  requireRole(["superadmin", "company_admin"]),
  controller.reassign
);
router.patch(
  "/:id/force-status",
  requireAuth,
  requireRole(["superadmin", "company_admin"]),
  controller.forceStatus
);
router.get("/:id", requireAuth, controller.getById);
router.patch("/:id/response", requireAuth, controller.saveResponse);
router.post("/:id/attachments", requireAuth, upload.array("files", 10), controller.uploadAttachments);
router.post("/:id/accept", requireAuth, controller.accept);
router.post("/:id/reject", requireAuth, controller.reject);
router.post("/:id/reopen", requireAuth, controller.reopen);

module.exports = router;
