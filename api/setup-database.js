import pkg from 'pg';
const { Pool } = pkg;
import fallbackConfig from '../js/config.js';

// Create a connection pool to Supabase
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper to send JSON responses
const json = (res, status, payload) => {
  res.status(status).json(payload);
};

export default async function handler(req, res) {
  // Only allow POST to avoid accidental GET-triggered schema changes
  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method not allowed. Use POST.' });
  }

  try {
    // Create postcard_logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS postcard_logs (
        id SERIAL PRIMARY KEY,
        sender_name VARCHAR(255),
        sender_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        recipient_email VARCHAR(255),
        recipient_address TEXT,
        sent_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(50) DEFAULT 'sent',
        front_image_url TEXT,
        back_image_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create configuration table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS configuration (
        id INTEGER PRIMARY KEY,
        settings JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Insert default configuration if not exists
    await pool.query(
      `INSERT INTO configuration (id, settings)
       VALUES (1, $1)
       ON CONFLICT (id) DO NOTHING`,
      [JSON.stringify(fallbackConfig)]
    );

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_postcard_logs_sender_email 
      ON postcard_logs(sender_email)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_postcard_logs_sent_at 
      ON postcard_logs(sent_at)
    `);

    return json(res, 200, { 
      message: 'Database setup complete!',
      tables: ['postcard_logs', 'configuration'],
      indexes: ['idx_postcard_logs_sender_email', 'idx_postcard_logs_sent_at']
    });

  } catch (error) {
    console.error('Database setup error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return json(res, 500, { 
      error: 'Database setup failed',
      details: errorMessage 
    });
  }
}
