const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  acceptViewInviteSchema,
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
router.post('/verify-email', validateReq(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-verification', validateReq(resendVerificationSchema), authController.resendVerification);
router.get('/view-invite/:token', authController.getViewInvite);
router.post(
  '/accept-view-invite',
  validateReq(acceptViewInviteSchema),
  authController.acceptViewInvite
);

module.exports = router;

