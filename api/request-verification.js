import pkg from 'pg';
const { Pool } = pkg;
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

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
        const { postcardData } = await parseJSONBody(request);
        const { sender, recipient, emailConfig } = postcardData;
        
        // Get configuration using pg Pool
        const configResult = await pool.query('SELECT settings FROM configuration WHERE id = 1');
        const config = configResult.rows[0]?.settings;
        
        if (!config || !config.limits) {
             throw new Error("Usage limits are not configured in the database.");
        }
        const { postcardLimit, limitDays } = config.limits;

        const cutoffDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000);
        
        // Check postcard logs using pg Pool
        const logResult = await pool.query(
            'SELECT COUNT(*) FROM postcard_logs WHERE sender_email = $1 AND sent_at > $2',
            [sender.email, cutoffDate.toISOString()]
        );
        const recentPostcardsCount = parseInt(logResult.rows[0].count, 10);
        
        if (recentPostcardsCount >= postcardLimit) {
            return response.status(429).json({ message: `Usage limit reached. You can send ${postcardLimit} postcards every ${limitDays} days.` });
        }

        const token = jwt.sign({ postcardData }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        const proto = request.headers['x-forwarded-proto'] || 'http';
        const host = request.headers['x-forwarded-host'] || request.headers.host;
        const verificationUrl = new URL(`/api/verify-and-send?token=${token}`, `${proto}://${host}`).toString();

        let subject = emailConfig.subject.replace(/{{senderName}}/g, sender.name).replace(/{{recipientName}}/g, recipient.name);
        let body = emailConfig.body.replace(/{{senderName}}/g, sender.name).replace(/{{recipientName}}/g, recipient.name);

        const buttonHtml = `<a href="${verificationUrl}" style="background-color: ${emailConfig.buttonColor}; color: ${emailConfig.buttonTextColor}; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">Click Here to Verify & Send</a>`;

        const msg = {
            to: sender.email,
            from: { 
                email: process.env.SENDGRID_FROM_EMAIL,
                name: emailConfig.senderName 
            },
            subject: subject,
            html: `
                <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <h2>${emailConfig.senderName}</h2>
                    <p>${body}</p>
                    ${buttonHtml}
                    <hr style="margin: 20px 0;"/>
                    <p style="font-weight: bold;">Your Postcard Preview:</p>
                    <p>Front:</p>
                    <img src="${postcardData.frontImageUrlForEmail}" alt="Postcard Front" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
                    <p style="margin-top: 20px;">Back:</p>
                    <img src="${postcardData.backImageUrlWithAddress}" alt="Postcard Back" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);"/>
                    <hr style="margin: 20px 0;"/>
                    ${buttonHtml}
                </div>
            `,
        };

        await sgMail.send(msg);

        return response.status(200).json({ message: 'Verification email sent.' });

    } catch (error) {
        console.error('Request verification error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return response.status(500).json({ message: 'Internal Server Error', details: errorMessage });
    }
}
