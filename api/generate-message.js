// --- NEW: Helper function to parse Vercel request body ---
async function getBody(request) {
    let body = '';
    for await (const chunk of request) {
        body += new TextDecoder().decode(chunk);
    }
    return body;
}

// --- KEPT: Your robust helper function for API calls ---
async function fetchWithRetry(apiKey, payload, retries = 3, delay = 1000) {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 429 && retries > 0) {
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithRetry(apiKey, payload, retries - 1, delay * 2);
            }
            const errorBody = await response.json();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody?.error?.message || 'Unknown'}`);
        }
        return response.json();

    } catch (error) {
        if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(apiKey, payload, retries - 1, delay * 2);
        }
        throw error;
    }
}


// The main Vercel serverless function handler
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- FIX: Use the 'getBody' function ---
    const bodyString = await getBody(request);
    const { recipient, topic, tone } = JSON.parse(bodyString || '{}');
    
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('Gemini API key is not set in environment variables.');
        return response.status(500).json({ message: 'AI service is not configured.' });
    }

    // --- FIX: Check all three fields ---
    if (!recipient || !topic || !tone) {
        return response.status(400).json({ message: `Missing required fields. Got: recipient=${recipient}, topic=${topic}, tone=${tone}` });
    }
    
    // --- KEPT: Your system prompt and payload structure ---
    const systemPrompt = "You are a friendly and creative postcard message writer. Write a short, concise, and personal message (about 3-4 sentences) that would fit on a postcard. Do not use greetings (like 'Dear...') or sign-offs (like 'From...'). Just write the body of the message.";
    const userQuery = `Write a postcard message to ${recipient || 'my friend'}. The topic is: '${topic}'. The desired tone is: '${tone}'.`;

    const payload = {
        contents: [{ parts: [{ text: userQuery }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
    };

    try {
        const result = await fetchWithRetry(apiKey, payload);
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

        if (text) {
            return response.status(200).json({ message: text.trim() });
        } else {
            throw new Error('No content generated or invalid API response.');
        }

    } catch (error) {
        console.error('AI generation failed:', error);
        return response.status(500).json({ message: 'AI generation failed. ' + error.message });
    }
}

