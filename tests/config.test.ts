import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// config.ts reads env at import time, so load a fresh copy per test.
const loadConfig = async () => {
  vi.resetModules();
  return (await import('../src/config.ts')).default;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('config', () => {
  it('uses local defaults', async () => {
    vi.stubEnv('PORT', '');
    vi.stubEnv('ALLOWED_ORIGINS', undefined);
    vi.stubEnv('NODE_ENV', 'test');
    const config = await loadConfig();
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual(['http://localhost:3001', 'http://localhost:5173']);
    expect(config.dbPath).toBe(path.resolve(import.meta.dirname, '..', 'contacts.db'));
  });

  it('reads PORT and a comma-separated ALLOWED_ORIGINS', async () => {
    vi.stubEnv('PORT', '8080');
    vi.stubEnv('ALLOWED_ORIGINS', 'https://a.com,https://b.com');
    const config = await loadConfig();
    expect(config.port).toBe(8080);
    expect(config.allowedOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('uses DB_PATH only in production', async () => {
    vi.stubEnv('DB_PATH', '/data/contacts.db');
    vi.stubEnv('NODE_ENV', 'development');
    expect((await loadConfig()).dbPath).not.toBe('/data/contacts.db');

    vi.stubEnv('NODE_ENV', 'production');
    expect((await loadConfig()).dbPath).toBe('/data/contacts.db');
  });

  it('reads Cloudinary credentials, empty when unset', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', undefined);
    vi.stubEnv('CLOUDINARY_API_KEY', undefined);
    vi.stubEnv('CLOUDINARY_API_SECRET', undefined);
    expect((await loadConfig()).cloudinary).toEqual({ cloudName: '', apiKey: '', apiSecret: '' });

    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'cloud');
    vi.stubEnv('CLOUDINARY_API_KEY', 'key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'secret');
    expect((await loadConfig()).cloudinary).toEqual({ cloudName: 'cloud', apiKey: 'key', apiSecret: 'secret' });
  });
});
