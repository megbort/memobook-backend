const { HttpError } = require('../lib/httpError');
const { isBlank } = require('../lib/fields');

const SOCIAL_FIELDS = ['platform', 'label', 'handle', 'url', 'sortOrder'];
const SOCIAL_PLATFORMS = ['instagram', 'x', 'linkedin', 'facebook', 'tiktok', 'github', 'other'];

const validateSocial = (social) => {
  if (!SOCIAL_PLATFORMS.includes(social.platform)) {
    throw new HttpError(400, `platform must be one of: ${SOCIAL_PLATFORMS.join(', ')}`);
  }
  if (social.platform === 'other' && isBlank(social.label)) {
    throw new HttpError(400, 'label is required when platform is "other"');
  }
  if (isBlank(social.handle) && isBlank(social.url)) {
    throw new HttpError(400, 'handle or url is required');
  }
};

const socialName = (social) => (social.platform === 'other' ? social.label : social.platform);

module.exports = { SOCIAL_FIELDS, SOCIAL_PLATFORMS, validateSocial, socialName };
