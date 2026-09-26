import type { AddressInfo } from 'node:net';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.ts';
import { createDb } from '../../src/db/connection.ts';
import { shutdown } from '../../src/lib/shutdown.ts';

describe('shutdown', () => {
  it('stops the server and closes the database', async () => {
    const db = createDb(':memory:');
    const server = createApp(db).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;

    await shutdown(server, db);

    expect(server.listening).toBe(false);
    await expect(db.get('SELECT 1')).rejects.toThrow();
    await expect(fetch(`http://localhost:${port}/contacts`)).rejects.toThrow();
  });

  it('rejects when the server is not running', async () => {
    const db = createDb(':memory:');
    const server = createApp(db).listen(0);
    await new Promise((resolve) => server.close(resolve));

    await expect(shutdown(server, db)).rejects.toThrow();
    await db.close();
  });
});
