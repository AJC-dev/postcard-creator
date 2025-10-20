import { put } from '@vercel/blob';

// Helper function to stream request body to a buffer using the classic Node.js event model for maximum compatibility.
function streamToBuffer(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => {
      chunks.push(chunk);
    });
    request.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    request.on('error', (error) => {
      reject(error);
    });
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

    const blob = await put(filename, fileBuffer, {
      access: 'public',
    });

    return response.status(200).json(blob);

  } catch (error) {
    console.error('Upload failed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return response.status(500).json({ error: 'Failed to upload file.', details: errorMessage });
  }
}

