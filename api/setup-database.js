import pkg from 'pg';
const { Pool } = pkg;
import fallbackConfig from '../js/config.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

const json = (res, status, payload) => res.status(status).json(payload);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS postcard_logs ( 
        id SERIAL PRIMARY KEY, sender_name VARCHAR(255), sender_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255), recipient_email VARCHAR(255), recipient_address TEXT,
        sent_at TIMESTAMP DEFAULT NOW(), status VARCHAR(50) DEFAULT 'sent',
        front_image_url TEXT, back_image_url TEXT, created_at TIMESTAMP DEFAULT NOW()
      )`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuration (
        id INTEGER PRIMARY KEY, settings JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
      )`);

    await pool.query(`INSERT INTO configuration (id, settings) VALUES (1, $1) ON CONFLICT (id) DO NOTHING`, 
      [JSON.stringify(fallbackConfig)]);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_postcard_logs_sender_email ON postcard_logs(sender_email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_postcard_logs_sent_at ON postcard_logs(sent_at)`);

    return json(res, 200, { 
      message: 'Database setup complete!',
      tables: ['postcard_logs', 'configuration'],
      indexes: ['idx_postcard_logs_sender_email', 'idx_postcard_logs_sent_at']
    });

  } catch (error) {
    console.error('Database setup error:', error);
    return json(res, 500, { error: 'Database setup failed', details: error.message });
  }
}
