const express = require('express');
const path = require('path');
const { pool, initSchema } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const VALID_TYPES = ['paas', 'postgres', 'rabbitmq', 'valkey'];

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function validateServers(servers) {
  if (!Array.isArray(servers) || servers.length === 0) return 'servers boş olamaz';
  for (const s of servers) {
    if (!s || typeof s !== 'object') return 'geçersiz sunucu kaydı';
    for (const key of ['ram', 'vcpu', 'storageTB', 'rent', 'backupPct', 'networkPct']) {
      if (!isFiniteNumber(s[key])) return `sunucu alanı geçersiz: ${key}`;
    }
  }
  return null;
}

// GET /api/clusters — list all saved clusters, newest first.
app.get('/api/clusters', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, service_type, servers, overhead, hours_per_month, tb_to_gib, created_at FROM clusters ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/clusters failed:', err);
    res.status(500).json({ error: 'Kümeler yüklenemedi.' });
  }
});

// POST /api/clusters — save a new cluster configuration.
app.post('/api/clusters', async (req, res) => {
  const { name, serviceType, servers, overhead, hoursPerMonth, tbToGib } = req.body || {};

  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name gerekli.' });
  }
  if (!VALID_TYPES.includes(serviceType)) {
    return res.status(400).json({ error: 'serviceType geçersiz.' });
  }
  const serverErr = validateServers(servers);
  if (serverErr) return res.status(400).json({ error: serverErr });
  if (!isFiniteNumber(overhead) || overhead < 0 || overhead > 90) {
    return res.status(400).json({ error: 'overhead 0-90 arasında bir sayı olmalı.' });
  }
  const hours = isFiniteNumber(hoursPerMonth) ? hoursPerMonth : 730;
  const tbGib = isFiniteNumber(tbToGib) ? tbToGib : 1024;

  try {
    const { rows } = await pool.query(
      `INSERT INTO clusters (name, service_type, servers, overhead, hours_per_month, tb_to_gib)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, service_type, servers, overhead, hours_per_month, tb_to_gib, created_at`,
      [name.trim(), serviceType, JSON.stringify(servers), overhead, hours, tbGib]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /api/clusters failed:', err);
    res.status(500).json({ error: 'Küme kaydedilemedi.' });
  }
});

// DELETE /api/clusters/:id — remove a saved cluster.
app.delete('/api/clusters/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'geçersiz id' });
  try {
    await pool.query('DELETE FROM clusters WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    console.error('DELETE /api/clusters/:id failed:', err);
    res.status(500).json({ error: 'Küme silinemedi.' });
  }
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

initSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Komuta hesap makinesi ${PORT} portunda çalışıyor.`));
  })
  .catch((err) => {
    console.error('Veritabanı şeması hazırlanamadı:', err);
    process.exit(1);
  });
