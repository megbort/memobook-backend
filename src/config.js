const path = require('node:path');

const config = {
  port: process.env.PORT || 3000,
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3001',
    'http://localhost:5173',
  ],
  dbPath:
    process.env.NODE_ENV === 'production' && process.env.DB_PATH
      ? process.env.DB_PATH
      : path.resolve(__dirname, '..', 'contacts.db'),
};

module.exports = config;
