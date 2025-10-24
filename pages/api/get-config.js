// pages/api/get-config.js
import { sql } from '@vercel/postgres';
import fallbackConfig from '../../js/config.js';

export default async function handler(req, res) {
  try {
    const { rows } = await sql`SELECT settings FROM configuration WHERE id = 1;`;
    let dbConfig = {};
    if (rows?.length && rows[0]?.settings) {
      const raw = rows[0].settings;
      dbConfig = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (typeof dbConfig !== 'object' || dbConfig === null) dbConfig = {};
    }
    const deepMerge = (t,s)=>{/* same as yours */};
    const clone = (o)=>JSON.parse(JSON.stringify(o));
    let config = deepMerge(clone(fallbackConfig), dbConfig);

    const apiKeys = {};
    if (process.env.RECAPTCHA_SITE_KEY) apiKeys.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    if (process.env.PIXABAY_API_KEY)   apiKeys.pixabayApiKey   = process.env.PIXABAY_API_KEY;
    config.apiKeys = { ...(config.apiKeys || {}), ...apiKeys };

    res.status(200).json(config);
  } catch (err) {
    const config = JSON.parse(JSON.stringify(fallbackConfig));
    const apiKeys = {};
    if (process.env.RECAPTCHA_SITE_KEY) apiKeys.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
    if (process.env.PIXABAY_API_KEY)   apiKeys.pixabayApiKey   = process.env.PIXABAY_API_KEY;
    config.apiKeys = { ...(config.apiKeys || {}), ...apiKeys };
    res.status(200).json(config);
  }
}
