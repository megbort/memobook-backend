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
    expect(config.port).toBe('8080');
    expect(config.allowedOrigins).toEqual(['https://a.com', 'https://b.com']);
  });

  it('uses DB_PATH only in production', async () => {
    vi.stubEnv('DB_PATH', '/data/contacts.db');
    vi.stubEnv('NODE_ENV', 'development');
    expect((await loadConfig()).dbPath).not.toBe('/data/contacts.db');

    vi.stubEnv('NODE_ENV', 'production');
    expect((await loadConfig()).dbPath).toBe('/data/contacts.db');
  });
});
