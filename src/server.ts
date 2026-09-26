import config from './config.ts';
import { createDb } from './db/connection.ts';
import { migrate } from './db/migrations.ts';
import { seedIfEmpty } from './db/seed.ts';
import { createApp } from './app.ts';
import { shutdown } from './lib/shutdown.ts';

const start = async () => {
  const db = createDb(config.dbPath);
  await migrate(db);
  const seeded = await seedIfEmpty(db);
  console.log(seeded ? 'Sample contacts inserted successfully!' : 'Contacts already exist, skipping seed.');
  const server = createApp(db).listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });

  process.once('SIGTERM', () => {
    shutdown(server, db)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error('Shutdown failed:', err.message);
        process.exit(1);
      });
  });
};

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
