import { sql } from '@vercel/postgres';
import fallbackConfig from '../js/config.js';

export default async function handler(request, response) {
    let config;
    try {
        const { rows } = await sql`SELECT settings FROM configuration WHERE id = 1;`;
        
        if (rows.length > 0 && Object.keys(rows[0].settings).length > 0) {
            config = rows[0].settings;
        } else {
            // If no config is in the DB, use the local file as the base
            config = fallbackConfig;
        }

        // Securely merge in the server-side environment variables for API keys
        config.apiKeys = {
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
            pixabayApiKey: process.env.PIXABAY_API_KEY,
        };

        return response.status(200).json(config);

    } catch (error) {
        console.error('Error fetching configuration from Postgres:', error);
        // On any database error, gracefully fall back to the default config
        let config = fallbackConfig;
         config.apiKeys = {
            recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY,
            pixabayApiKey: process.env.PIXABAY_API_KEY,
        };
        return response.status(200).json(config); // Always return a valid config object
    }
}

