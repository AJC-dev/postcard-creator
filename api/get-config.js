import pkg from 'pg';
const { Pool } = pkg;
import fallbackConfig from '../js/config.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: false, 
  max: 1,
  connectionTimeoutMillis: 10000
});

// simple deep merge without external deps
const deepMerge = (target, source) => {
  if (typeof target !== 'object' || target === null) return source;
  if (typeof source !== 'object' || source === null) return target;
  const out = Array.isArray(target) ? [...target] : { ...target };
  for (const [k, v] of Object.entries(source)) {
    out[k] = deepMerge(out[k], v);
  }
  return out;
};

// safe clone
const clone = (obj) => JSON.parse(JSON.stringify(obj));

export default async function handler(request, response) {
  try {
    // 1) Read from DB using pg Pool
    const result = await pool.query('SELECT settings FROM configuration WHERE id = 1');
    const rows = result.rows;

    // 2) Normalize DB payload
    let dbConfig = {};
    if (rows?.length && rows[0]?.settings) {
      const raw = rows[0].settings;
      dbConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (typeof dbConfig !== 'object' || dbConfig === null) dbConfig = {};
    }

    // 3) Start from fallback (clone to avoid mutation), and deep-merge DB on top
    let config = deepMerge(clone(fallbackConfig), dbConfig);

    // 4) Add public API keys from env (only if present)
    const apiKeys = {};
    if (process.env.RECAPTCHA_SITE_KEY) apiKeys.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    if (process.env.PIXABAY_API_KEY) apiKeys.pixabayApiKey = process.env.PIXABAY_API_KEY;

    // ensure apiKeys exists, then graft only defined keys
    config.apiKeys = { ...(config.apiKeys || {}), ...apiKeys };

    return response.status(200).json(config);
  } catch (err) {
    console.error('Error fetching configuration from Postgres:', err);

    // Graceful fallback
    const config = clone(fallbackConfig);
    const apiKeys = {};
    if (process.env.RECAPTCHA_SITE_KEY) apiKeys.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    if (process.env.PIXABAY_API_KEY) apiKeys.pixabayApiKey = process.env.PIXABAY_API_KEY;
    config.apiKeys = { ...(config.apiKeys || {}), ...apiKeys };

    return response.status(200).json(config);
  }
}
