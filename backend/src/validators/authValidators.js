const Joi = require('joi');
const { PLAIN_NAME_RE, MAX_NAME_LEN } = require('../utils/plainTextName');
const { PLAIN_COMPANY_RE, MAX_COMPANY_LEN } = require('../utils/plainTextCompany');
const { NEW_PASSWORD_PATTERN } = require('../utils/passwordPolicy');

const nameFieldMessages = {
  'string.empty': 'This field is required',
  'string.pattern.base':
    'May only contain letters, spaces, apostrophes, hyphens, and periods (no HTML, numbers, or symbols)',
};

const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required().messages({
    'string.empty': 'Username is required',
    'string.alphanum': 'Username must be letters or numbers',
  }),
  firstName: Joi.string()
    .trim()
    .min(1)
    .max(MAX_NAME_LEN)
    .pattern(PLAIN_NAME_RE)
    .required()
    .messages({ ...nameFieldMessages, 'string.empty': 'First name is required' }),
  lastName: Joi.string()
    .trim()
    .min(1)
    .max(MAX_NAME_LEN)
    .pattern(PLAIN_NAME_RE)
    .required()
    .messages({ ...nameFieldMessages, 'string.empty': 'Last name is required' }),
  email: Joi.string().email().required().messages({ 'string.email': 'Enter a valid email', 'string.empty': 'Email is required' }),
  jobTitle: Joi.string().allow('', null),
  employer: Joi.string()
    .trim()
    .min(1)
    .max(MAX_COMPANY_LEN)
    .pattern(PLAIN_COMPANY_RE)
    .required()
    .messages({
      'string.empty': 'Company name is required',
      'any.required': 'Company name is required',
      'string.pattern.base':
        'Company name may only contain letters, numbers, spaces, and . \' - & , ( ) / (no HTML)',
    }),
  mobile: Joi.string().pattern(/^\+?\d{7,15}$/).required().messages({ 'string.empty': 'Mobile number is required', 'string.pattern.base': 'Enter a valid phone number (7–15 digits)' }),
  password: Joi.string()
    .pattern(NEW_PASSWORD_PATTERN)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.pattern.base':
        'Password must be 8–128 characters and include one uppercase letter, one number, and one special character (not a space)',
    }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match', 'any.required': 'Please confirm password' }),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Enter a valid email',
    'string.empty': 'Email is required',
  }),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Reset token is required',
  }),
  password: Joi.string()
    .pattern(NEW_PASSWORD_PATTERN)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.pattern.base':
        'Password must be 8–128 characters and include one uppercase letter, one number, and one special character (not a space)',
    }),
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Verification token is required',
  }),
});

const resendVerificationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Enter a valid email',
    'string.empty': 'Email is required',
  }),
});

const acceptViewInviteSchema = Joi.object({
  token: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Invitation token is required',
  }),
  otp: Joi.string().trim().pattern(/^\d{6}$/).required().messages({
    'string.empty': 'Verification code is required',
    'string.pattern.base': 'Enter the 6-digit code from your email',
  }),
  password: Joi.string()
    .pattern(NEW_PASSWORD_PATTERN)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.pattern.base':
        'Password must be 8–128 characters and include one uppercase letter, one number, and one special character (not a space)',
    }),
  passwordConfirm: Joi.any().valid(Joi.ref('password')).required().messages({
    'any.only': 'Passwords do not match',
    'any.required': 'Please confirm password',
  }),
});

const viewInviteTokenParamSchema = Joi.object({
  token: Joi.string().trim().min(1).required(),
});

const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),
  newPassword: Joi.string()
    .pattern(NEW_PASSWORD_PATTERN)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.pattern.base':
        'Password must be 8–128 characters and include one uppercase letter, one number, and one special character (not a space)',
    }),
});

module.exports = {
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  acceptViewInviteSchema,
  viewInviteTokenParamSchema,
  changePasswordSchema,
};
