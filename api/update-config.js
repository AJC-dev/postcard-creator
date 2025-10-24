import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function parseJSONBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => { body += chunk.toString(); });
    request.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
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
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('configuration')
      .upsert({ id: 1, settings: newConfig })
      .select();

    if (error) {
      console.error('Error saving configuration:', error);
      return response.status(500).json({ 
        message: 'Error saving configuration.', 
        details: error.message 
      });
    }

    return response.status(200).json({ 
      message: 'Configuration saved successfully.',
      data: data 
    });
  } catch (error) {
    console.error('Error saving configuration:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ 
      message: 'Error saving configuration.', 
      details: errorMessage 
    });
  }
}
