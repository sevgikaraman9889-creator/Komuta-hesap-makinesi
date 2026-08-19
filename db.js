const { Pool } = require('pg');

// node-postgres automatically falls back to the standard libpq environment
// variables (PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE) when no config is
// passed, so this works whether the platform wires a single DATABASE_URL or
// separate PG* variables when the managed PostgreSQL addon is attached.
//
// Komuta's managed PostgreSQL presents a self-signed certificate, so we still
// connect over TLS but skip certificate-chain verification. Passing an
// explicit `ssl` object should be enough on its own, but newer pg-connection-string
// versions also derive their own (stricter, verify-full-equivalent) SSL config
// from a `sslmode=require` query param in the URL and that can win out over
// our explicit setting — so we strip `sslmode` from the URL entirely and let
// our own `ssl: { rejectUnauthorized: false }` be the only source of truth.
function stripSslMode(connectionString) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('sslmode');
    return url.toString();
  } catch {
    return connectionString;
  }
}

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: stripSslMode(process.env.DATABASE_URL), ssl: { rejectUnauthorized: false } }
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
