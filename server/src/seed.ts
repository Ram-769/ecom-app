import { configValues } from './config.js';
import { MongoRepository } from './repositories/mongo.repository.js';

async function seed(): Promise<void> {
  if (configValues.DATA_MODE !== 'mongodb' || !configValues.MONGODB_URI) throw new Error('Set DATA_MODE=mongodb and MONGODB_URI in .env before seeding.');
  const repository = new MongoRepository(configValues.MONGODB_URI, configValues.MONGODB_DB);
  try { await repository.connect(); await repository.seed(); console.log('Sample catalog seeded. Existing products and orders were preserved.'); }
  finally { await repository.close(); }
}
seed().catch(() => { console.error('Seeding failed. Check the Atlas connection, database user permissions, and IP access list.'); process.exitCode = 1; });
