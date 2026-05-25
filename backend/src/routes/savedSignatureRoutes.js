const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const {
  listSavedSignatures,
  syncSavedSignatures,
} = require("../controllers/savedSignatureController");

router.use(requireAuth);

router.get("/", listSavedSignatures);
router.put("/", syncSavedSignatures);

module.exports = router;
