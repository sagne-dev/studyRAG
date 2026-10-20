import { pool } from './pool.js';

async function reset() {
  const client = await pool.connect();
  try {
    console.log('🗑️  Resetting database (dropping all tables)...');
    await client.query(`
      DROP TABLE IF EXISTS messages CASCADE;
      DROP TABLE IF EXISTS conversations CASCADE;
      DROP TABLE IF EXISTS chunks CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
    `);
    console.log('✅ Database reset complete. Run db:migrate to reinitialize.');
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
