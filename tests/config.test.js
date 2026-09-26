import { createRequire } from 'node:module';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const require = createRequire(import.meta.url);
const configPath = require.resolve('../src/config.js');

// config.js reads env at require time, so load a fresh copy per test.
const loadConfig = () => {
  delete require.cache[configPath];
  return require(configPath);
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('config', () => {
  it('uses local defaults', () => {
    vi.stubEnv('PORT', '');
    vi.stubEnv('ALLOWED_ORIGINS', undefined);
    vi.stubEnv('NODE_ENV', 'test');
    const config = loadConfig();
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual(['http://localhost:3001', 'http://localhost:5173']);
    expect(config.dbPath).toBe(path.resolve(path.dirname(configPath), '..', 'contacts.db'));
  });

  it('reads PORT and a comma-separated ALLOWED_ORIGINS', () => {
    vi.stubEnv('PORT', '8080');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://a.com,https://b.com');
    const config = loadConfig();
    expect(config.port).toBe('8080');
    expect(config.allowedOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('uses DB_PATH only in production', () => {
    vi.stubEnv('DB_PATH', '/data/contacts.db');
    vi.stubEnv('NODE_ENV', 'development');
    expect(loadConfig().dbPath).not.toBe('/data/contacts.db');

    vi.stubEnv('NODE_ENV', 'production');
    expect(loadConfig().dbPath).toBe('/data/contacts.db');
  });
});
