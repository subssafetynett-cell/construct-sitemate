const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/authValidators');
const validateReq = require('../middleware/validatereq');
const { requireAuth } = require('../middleware/auth');

router.post('/signup', validateReq(signupSchema), authController.signup);
router.post('/login', authController.login);
router.get('/me', requireAuth, authController.me);
router.post(
  '/change-password',
  requireAuth,
  validateReq(changePasswordSchema),
  authController.changePassword
);

// 2FA Routes
router.post('/setup-2fa', requireAuth, authController.setup2FA);
router.post('/verify-2fa', requireAuth, authController.verify2FA);

router.post('/forgot-password', validateReq(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateReq(resetPasswordSchema), authController.resetPassword);

module.exports = router;

