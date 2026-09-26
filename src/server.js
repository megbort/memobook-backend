const config = require('./config');
const { createDb } = require('./db/connection');
const { migrate } = require('./db/migrations');
const { createApp } = require('./app');

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
