import type { Server } from 'node:http';
import type { Db } from '../db/connection.ts';

export const shutdown = async (server: Server, db: Db) => {
  await new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
  await db.close();
};
