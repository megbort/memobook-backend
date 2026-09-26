const { HttpError } = require('../lib/httpError');
const { isBlank } = require('../lib/fields');

const CUSTOM_FIELD_FIELDS = ['section', 'label', 'value', 'sortOrder'];
const FIELD_SECTIONS = ['personal', 'address'];

const validateCustomField = (field) => {
  if (!FIELD_SECTIONS.includes(field.section)) {
    throw new HttpError(400, `section must be one of: ${FIELD_SECTIONS.join(', ')}`);
  }
  if (isBlank(field.label)) throw new HttpError(400, 'label is required');
};

module.exports = { CUSTOM_FIELD_FIELDS, FIELD_SECTIONS, validateCustomField };
