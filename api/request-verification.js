import pkg from 'pg';
const { Pool } = pkg;
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
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
        // Parse the request body
        const body = await parseJSONBody(request);
        
        // Validate the request structure
        if (!body.postcardData) {
            return response.status(400).json({ 
                message: 'Bad Request', 
                details: 'Missing postcardData in request body' 
            });
        }

        const { postcardData } = body;
        const { sender, recipient, emailConfig } = postcardData;
        
        // Validate required fields
        if (!sender || !sender.email || !sender.name) {
            return response.status(400).json({ 
                message: 'Bad Request', 
                details: 'Missing or invalid sender information' 
            });
        }
        
        if (!recipient || !recipient.name) {
            return response.status(400).json({ 
                message: 'Bad Request', 
                details: 'Missing or invalid recipient information' 
            });
        }
        
        if (!emailConfig || !emailConfig.subject || !emailConfig.body) {
            return response.status(400).json({ 
                message: 'Bad Request', 
                details: 'Missing or invalid email configuration' 
            });
        }

        if (!postcardData.frontImageUrlForEmail || !postcardData.backImageUrlWithAddress) {
            return response.status(400).json({ 
                message: 'Bad Request', 
                details: 'Missing postcard image URLs' 
            });
        }
        
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
        let emailBody = emailConfig.body.replace(/{{senderName}}/g, sender.name).replace(/{{recipientName}}/g, recipient.name);

        // --- FIX: Get button colors from database config ---
        // Use sendPostcardButton colors for the verification email button
        const buttonColor = config?.styles?.sendPostcardButtonColor || '#212529';
        const buttonTextColor = config?.styles?.sendPostcardButtonTextColor || '#FFFFFF';
        
        const buttonHtml = `<a href="${verificationUrl}" style="background-color: ${buttonColor}; color: ${buttonTextColor}; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-weight: bold;">Click Here to Verify & Send</a>`;

        // --- ENHANCEMENT: Use Robust, Table-Based HTML Email Template ---
        const emailHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${subject}</title>
            <style>
                body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
                table { border-collapse: collapse !important; }
                body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
            </style>
        </head>
        <body style="background-color: #f4f4f4; margin: 0 !important; padding: 0 !important;">
            <!--[if mso]>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px;">
            <tr>
            <td>
            <![endif]-->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <!-- 1. HEADER -->
                <tr>
                    <td align="center" style="padding: 40px 20px 20px 20px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif;">
                        <h2 style="font-size: 24px; font-weight: bold; color: #333333; margin: 0;">${emailConfig.senderName}</h2>
                    </td>
                </tr>
                <!-- 2. BODY TEXT -->
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                        <p style="margin: 0;">${emailBody}</p>
                    </td>
                </tr>
                <!-- 3. VERIFICATION BUTTON (Top) -->
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px;">
                        ${buttonHtml}
                    </td>
                </tr>
                <!-- 4. DIVIDER -->
                <tr>
                    <td align="center" style="padding: 20px 30px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="border-top: 1px solid #eeeeee;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- 5. POSTCARD PREVIEW (FRONT) -->
                <tr>
                    <td align="center" style="padding: 20px 30px 10px 30px;">
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #333333; margin: 0 0 10px 0;">Your Postcard Preview:</p>
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; color: #555555; margin: 0 0 5px 0;">Front:</p>
                        <img src="${postcardData.frontImageUrlForEmail}" alt="Postcard Front" width="400" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block; margin-left: auto; margin-right: auto;"/>
                    </td>
                </tr>
                <!-- 6. POSTCARD PREVIEW (BACK) -->
                <tr>
                    <td align="center" style="padding: 10px 30px 20px 30px;">
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; color: #555555; margin: 0 0 5px 0;">Back:</p>
                        <img src="${postcardData.backImageUrlWithAddress}" alt="Postcard Back" width="400" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block; margin-left: auto; margin-right: auto;"/>
                    </td>
                </tr>
                <!-- 7. DIVIDER -->
                <tr>
                    <td align="center" style="padding: 20px 30px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="border-top: 1px solid #eeeeee;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- 8. VERIFICATION BUTTON (Bottom) -->
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px;">
                        ${buttonHtml}
                    </td>
                </tr>
                <!-- 9. FOOTER -->
                <tr>
                    <td align="center" style="padding: 30px 30px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #888888;">
                        <p style="margin: 0;">You received this email to verify your request to send a postcard.</p>
                    </td>
                </tr>
            </table>
            <!--[if mso]>
            </td>
            </tr>
            </table>
            <![endif]-->
        </body>
        </html>
        `;
        // --- END ENHANCEMENT ---

        const msg = {
            to: sender.email,
            from: { 
                email: process.env.SENDGRID_FROM_EMAIL,
                name: emailConfig.senderName 
            },
            subject: subject,
            html: emailHtml,
        };

        await sgMail.send(msg);

        return response.status(200).json({ message: 'Verification email sent.' });

    } catch (error) {
        console.error('Request verification error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return response.status(500).json({ message: 'Internal Server Error', details: errorMessage });
    }
}