import { sql } from '@vercel/postgres';

function parseJSONBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk.toString();
    });
    request.on('end', () => {
      try {
        if (body === '') {
          resolve({});
          return;
        }
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    request.on('error', (err) => {
        reject(err);
    });
  });
}

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const newConfig = await parseJSONBody(request);
        
        // Use JSON.stringify to pass the object correctly to the SQL query
        await sql`
            INSERT INTO configuration (id, settings)
            VALUES (1, ${JSON.stringify(newConfig)})
            ON CONFLICT (id) DO UPDATE
            SET settings = EXCLUDED.settings;
        `;

        console.log("Successfully saved new configuration to Postgres.");

        return response.status(200).json({ message: 'Configuration saved successfully.' });

    } catch (error) {
        console.error('Error saving configuration to Postgres:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return response.status(500).json({ message: 'Error saving configuration.', details: errorMessage });
    }
}

