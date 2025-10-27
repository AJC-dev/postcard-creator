import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false
});

function parseJSONBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk.toString(); });
    request.on('end', () => {
      try {
        resolve(body === '' ? {} : JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    request.on('error', (err) => { reject(err); });
  });
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const newConfig = await parseJSONBody(request);
        
        await pool.query(
            `INSERT INTO configuration (id, settings, updated_at) VALUES (1, $1, NOW())
             ON CONFLICT (id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = NOW()`,
            [JSON.stringify(newConfig)]
        );

        console.log("Successfully saved new configuration to Postgres.");
        return response.status(200).json({ message: 'Configuration saved successfully.' });

    } catch (error) {
        console.error('Error saving configuration to Postgres:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return response.status(500).json({ message: 'Error saving configuration.', details: errorMessage });
    }
}
