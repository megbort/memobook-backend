import type { Db } from '../db/connection.ts';

export const nextSortOrder = async (db: Db, table: string, contactId: string) => {
  const row = await db.get<{ next: number }>(
    `SELECT COALESCE(MAX(sortOrder) + 1, 0) AS next FROM ${table} WHERE contactId = ?`,
    [contactId],
  );
  return row!.next;
};
