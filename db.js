const { Pool } = require('pg');

// node-postgres automatically falls back to the standard libpq environment
// variables (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) when no config is
// passed, so this works whether the platform wires a single DATABASE_URL or
// separate PG* variables when the managed PostgreSQL addon is attached.
//
// Komuta's managed PostgreSQL presents a self-signed certificate, so we still
// connect over TLS but skip certificate-chain verification (rejectUnauthorized:
// false) — otherwise node-postgres refuses the connection with "self-signed
// certificate in certificate chain".
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {}
);

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clusters (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      servers JSONB NOT NULL,
      overhead NUMERIC NOT NULL,
      hours_per_month NUMERIC NOT NULL DEFAULT 730,
      tb_to_gib NUMERIC NOT NULL DEFAULT 1024,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

module.exports = { pool, initSchema };
