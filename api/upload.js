import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

function streamToBuffer(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => { chunks.push(chunk); });
    request.on('end', () => { resolve(Buffer.concat(chunks)); });
    request.on('error', (error) => { reject(error); });
  });
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const proto = request.headers['x-forwarded-proto'] || 'http';
    const host = request.headers['x-forwarded-host'] || request.headers.host;
    const fullUrl = new URL(request.url, `${proto}://${host}`);
    
    const filename = fullUrl.searchParams.get('filename');

    if (!filename) {
      return response.status(400).json({ error: "Missing 'filename' query parameter." });
    }

    const fileBuffer = await streamToBuffer(request);
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.storage
      .from('postcard-images')
      .upload(filename, fileBuffer, {
        contentType: request.headers['content-type'] || 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return response.status(500).json({ 
        error: 'Failed to upload file.', 
        details: error.message 
      });
    }

    const { data: publicUrlData } = supabase.storage
      .from('postcard-images')
      .getPublicUrl(filename);

    return response.status(200).json({
      url: publicUrlData.publicUrl,
      pathname: filename,
      contentType: request.headers['content-type'] || 'application/octet-stream',
      uploadedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ 
      error: 'Failed to upload file.', 
      details: errorMessage 
    });
  }
}
