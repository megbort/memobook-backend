import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb } from '../../src/db/connection.js';

let db;

afterEach(async () => {
  await db?.close();
  db = undefined;
});

describe('createDb', () => {
  it('runs statements and reads rows back', async () => {
    db = createDb(':memory:');
    await db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT)');
    const result = await db.run('INSERT INTO t (v) VALUES (?)', ['a']);
    expect(result).toEqual({ changes: 1, lastID: 1 });
    expect(await db.get('SELECT v FROM t WHERE id = ?', [1])).toEqual({ v: 'a' });
    expect(await db.all('SELECT v FROM t')).toEqual([{ v: 'a' }]);
  });

  it('rejects on SQL errors', async () => {
    db = createDb(':memory:');
    await expect(db.run('NOT SQL')).rejects.toThrow();
    await expect(db.get('NOT SQL')).rejects.toThrow();
    await expect(db.all('NOT SQL')).rejects.toThrow();
    await expect(db.exec('NOT SQL')).rejects.toThrow();
  });

  it('creates the folder for a file database', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memobook-'));
    const file = path.join(dir, 'nested', 'test.db');
    db = createDb(file);
    await db.run('CREATE TABLE t (id INTEGER)');
    await db.close();
    db = undefined;
    expect(fs.existsSync(file)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('rejects close() on an already closed database', async () => {
    const closing = createDb(':memory:');
    await closing.close();
    await expect(closing.close()).rejects.toThrow();
  });

  describe('withTransaction', () => {
    it('commits and returns the callback value', async () => {
      db = createDb(':memory:');
      await db.exec('CREATE TABLE t (v TEXT)');
      const value = await db.withTransaction(async () => {
        await db.run("INSERT INTO t VALUES ('kept')");
        return 42;
      });
      expect(value).toBe(42);
      expect(await db.all('SELECT v FROM t')).toEqual([{ v: 'kept' }]);
    });

    it('rolls back when the callback throws', async () => {
      db = createDb(':memory:');
      await db.exec('CREATE TABLE t (v TEXT)');
      await expect(
        db.withTransaction(async () => {
          await db.run("INSERT INTO t VALUES ('gone')");
          throw new Error('boom');
        }),
      ).rejects.toThrow('boom');
      expect(await db.all('SELECT v FROM t')).toEqual([]);
    });

    it('queues transactions so they never overlap', async () => {
      db = createDb(':memory:');
      await db.exec('CREATE TABLE t (v TEXT)');
      const order = [];
      const slow = db.withTransaction(async () => {
        order.push('a:start');
        await new Promise((resolve) => setTimeout(resolve, 20));
        await db.run("INSERT INTO t VALUES ('a')");
        order.push('a:end');
      });
      const fast = db.withTransaction(async () => {
        order.push('b:start');
        await db.run("INSERT INTO t VALUES ('b')");
        order.push('b:end');
      });
      await Promise.all([slow, fast]);
      expect(order).toEqual(['a:start', 'a:end', 'b:start', 'b:end']);
    });

    it('keeps working after a failed transaction', async () => {
      db = createDb(':memory:');
      await db.exec('CREATE TABLE t (v TEXT)');
      await db.withTransaction(() => Promise.reject(new Error('first'))).catch(() => {});
      await db.withTransaction(() => db.run("INSERT INTO t VALUES ('second')"));
      expect(await db.all('SELECT v FROM t')).toEqual([{ v: 'second' }]);
    });
  });
});
