import config from './config.ts';
import { createDb } from './db/connection.ts';
import { migrate } from './db/migrations.ts';
import { createApp } from './app.ts';

const start = async () => {
  const db = createDb(config.dbPath);
  await migrate(db);
  createApp(db).listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
};

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
