const Joi = require('joi');
const { PLAIN_NAME_RE, MAX_NAME_LEN } = require('../utils/plainTextName');
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
  employer: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Company name is required',
    'any.required': 'Company name is required'
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
  changePasswordSchema,
};
