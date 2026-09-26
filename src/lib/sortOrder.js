const nextSortOrder = async (db, table, contactId) => {
  const row = await db.get(
    `SELECT COALESCE(MAX(sortOrder) + 1, 0) AS next FROM ${table} WHERE contactId = ?`,
    [contactId],
  );
  return row.next;
};

module.exports = { nextSortOrder };
