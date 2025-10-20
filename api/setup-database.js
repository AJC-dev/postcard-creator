import { createPool } from '@vercel/postgres';
import fallbackConfig from '../js/config.js';

// Manually create a connection pool using your custom environment variable
const sql = createPool({
  connectionString: process.env.PC_POSTGRES_URL,
}).sql;

export default async function handler(request, response) {
    try {
        // Create the postcard_logs table with all required fields
        await sql`
            CREATE TABLE IF NOT EXISTS postcard_logs (
                id SERIAL PRIMARY KEY,
                sender_name VARCHAR(255),
                sender_email VARCHAR(255) NOT NULL,
                recipient_name VARCHAR(255),
                recipient_line1 TEXT,
                recipient_line2 TEXT,
                recipient_city VARCHAR(255),
                recipient_postcode VARCHAR(255),
                recipient_country VARCHAR(255),
                front_image_url TEXT,
                back_image_url TEXT,
                sent_at TIMESTAMPTZ DEFAULT NOW()
            );
        `;

        // Create the configuration table
        await sql`
            CREATE TABLE IF NOT EXISTS configuration (
                id INT PRIMARY KEY,
                settings JSONB
            );
        `;

        // Insert the default configuration from your config.js file if no config exists
        await sql`
            INSERT INTO configuration (id, settings)
            VALUES (1, ${JSON.stringify(fallbackConfig)})
            ON CONFLICT (id) DO NOTHING;
        `;

        return response.status(200).json({ message: 'Database tables created and initialized successfully.' });
    } catch (error) {
        console.error('Error setting up database:', error);
        return response.status(500).json({ error: 'Failed to set up database.', details: error.message });
    }
}

