const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const kpiDashboardController = require("../controllers/kpiDashboardController");

router.use(requireAuth);

router.get("/:section", kpiDashboardController.getKpiDashboard);
router.put("/:section", kpiDashboardController.saveKpiDashboard);

module.exports = router;
