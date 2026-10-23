import { configValues } from './config.js';
import { createApp } from './app.js';
import { MemoryRepository } from './repositories/memory.repository.js';
import { MongoRepository } from './repositories/mongo.repository.js';
import type { StoreRepository } from './repositories/store.repository.js';

async function main(): Promise<void> {
  let repository: StoreRepository;
  if (configValues.DATA_MODE === 'mongodb') {
    const mongo = new MongoRepository(configValues.MONGODB_URI!, configValues.MONGODB_DB);
    try { await mongo.connect(); } catch { await mongo.close(); throw new Error('Atlas connection failed. Check database credentials and the Atlas IP access list.'); }
    repository = mongo;
  } else { repository = new MemoryRepository(); }
  const app = createApp(repository, { clientOrigin: configValues.CLIENT_ORIGIN, serveClient: configValues.NODE_ENV === 'production' });
  const server = app.listen(configValues.PORT, '127.0.0.1', () => {
    console.log(`Store API: http://localhost:${configValues.PORT} (${repository.mode})`);
  });
  const shutdown = (): void => {
    server.close(() => { void repository.close().finally(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  server.on('error', () => { console.error('API could not start. Check that PORT is available.'); void repository.close(); process.exitCode = 1; });
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'API startup failed.'); process.exitCode = 1; });
