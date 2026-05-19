// src/validators/clientsValidators.js
const Joi = require('joi');
const { PLAIN_COMPANY_RE, MAX_COMPANY_LEN } = require('../utils/plainTextCompany');

const createClientSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(MAX_COMPANY_LEN)
    .pattern(PLAIN_COMPANY_RE)
    .required()
    .messages({
      'string.empty': 'Client name is required',
      'string.pattern.base':
        'Client name may only contain letters, numbers, spaces, and . \' - & , ( ) / (no HTML)',
    }),
  logo: Joi.string().uri({ scheme: ['http','https'] }).allow(null, '').messages({
    'string.uri': 'Logo must be a valid URL (http:// or https://)',
  }),
});

module.exports = { createClientSchema };
