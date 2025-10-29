import pkg from 'pg';
const { Pool } = pkg;
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false }
});

async function sendToPrintAPI(postcardData, postcardCount) {
    const { sender, recipient, frontImageUrl, backImageUrl } = postcardData;
    const { ZAPPOST_USERNAME, ZAPPOST_PASSWORD, ZAPPOST_CAMPAIGN_ID } = process.env;

    if (!ZAPPOST_USERNAME || !ZAPPOST_PASSWORD || !ZAPPOST_CAMPAIGN_ID) {
        throw new Error("Missing required Zap-Post environment variables.");
    }

    const result = await pool.query('SELECT settings FROM configuration WHERE id = 1');
    const config = result.rows[0]?.settings;
    const postcardPromoImageUrl = config?.postcardPromo?.imageURL || "";

    const customerId = `${sender.email}-${recipient.postcode.replace(/\s/g, '')}-${postcardCount}`;

    const apiPayload = {
        campaignId: ZAPPOST_CAMPAIGN_ID,
        scheduledSendDateId: "",
        onlyValidRecords: true,
        submissions: [{
            customerid: customerId,
            email: sender.email,
            salutation: "",
            firstname: recipient.name,
            surname: "",
            companyname: "",
            address1: recipient.line1,
            address2: recipient.line2 || "",
            address3: "",
            city: recipient.city,
            postcode: recipient.postcode,
            country: recipient.country,
            currency: "GBP",
            language: "en",
            customdata: {
                "front": frontImageUrl,
                "message": backImageUrl,
                "sender": sender.name,
                "promo": postcardPromoImageUrl
            }
        }]
    };

    const basicAuth = Buffer.from(`${ZAPPOST_USERNAME}:${ZAPPOST_PASSWORD}`).toString('base64');
    const response = await fetch('https://api.zappost.com/api/v1/records', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
            'Accept': '*/*'
        },
        body: JSON.stringify(apiPayload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to send postcard to print API. Status: ${response.status}. Body: ${errorBody}`);
    }

    console.log("Successfully sent to Zap-Post API.");
    return response.json();
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(request, response) {
    const { token } = request.query;
    if (!token) {
        return response.status(400).send('<h1>Error</h1><p>Missing verification token.</p>');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const { postcardData } = decoded; 
        const { sender, recipient } = postcardData;
        
        const proto = request.headers['x-forwarded-proto'] || 'http';
        const host = request.headers['x-forwarded-host'] || request.headers.host;
        const sendAgainUrl = new URL('/?sendAgain=true', `${proto}://${host}`).toString();
        
        const configResult = await pool.query('SELECT settings FROM configuration WHERE id = 1');
        const config = configResult.rows[0]?.settings;
        if (!config) {
            throw new Error("Live configuration not found in database.");
        }
        
        // Use the successPage button colors for "Send Again" button
        const buttonColor = config?.successPage?.buttonColor || '#212529';
        const buttonTextColor = config?.successPage?.buttonTextColor || '#FFFFFF';
        
        const sendAgainButtonHtml = `<a href="${sendAgainUrl}" style="background-color: ${buttonColor}; color: ${buttonTextColor}; padding: 15px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-weight: bold;">Send this postcard to someone else?</a>`;

        const { confirmationEmail: confirmationEmailConfig } = config;
        
        // Get postcard count for this sender in the last 30 days
        const { limitDays } = config.limits;
        const cutoffDate = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000);
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM postcard_logs WHERE sender_email = $1 AND sent_at > $2',
            [sender.email, cutoffDate.toISOString()]
        );
        const postcardCount = parseInt(countResult.rows[0].count, 10) + 1;
        
        await pool.query(
            `INSERT INTO postcard_logs (sender_name, sender_email, recipient_name, recipient_email, recipient_address, front_image_url, back_image_url, sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [sender.name, sender.email, recipient.name, recipient.email || '', 
             `${recipient.line1}, ${recipient.line2 || ''}, ${recipient.city}, ${recipient.postcode}, ${recipient.country}`,
             postcardData.frontImageUrl, postcardData.backImageUrl, new Date().toISOString()]
        );

        await sendToPrintAPI(postcardData, postcardCount);

        let subject = confirmationEmailConfig.subject.replace(/{{senderName}}/g, sender.name).replace(/{{recipientName}}/g, recipient.name);
        let body = confirmationEmailConfig.body.replace(/{{senderName}}/g, sender.name).replace(/{{recipientName}}/g, recipient.name);

        // --- ENHANCEMENT: Robust, Table-Based HTML Email Template ---
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
                        <h2 style="font-size: 24px; font-weight: bold; color: #333333; margin: 0;">${confirmationEmailConfig.senderName}</h2>
                    </td>
                </tr>
                <!-- 2. BODY TEXT -->
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                        <p style="margin: 0;">${body}</p>
                    </td>
                </tr>
                <!-- 3. POSTCARD PREVIEW (FRONT) -->
                <tr>
                    <td align="center" style="padding: 20px 30px 10px 30px;">
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; font-weight: bold; color: #333333; margin: 0 0 10px 0;">Your Postcard:</p>
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; color: #555555; margin: 0 0 5px 0;">Front:</p>
                        <img src="${postcardData.frontImageUrlForEmail}" alt="Postcard Front" width="400" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block;"/>
                    </td>
                </tr>
                <!-- 4. POSTCARD PREVIEW (BACK) -->
                <tr>
                    <td align="center" style="padding: 10px 30px 20px 30px;">
                        <p style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 14px; color: #555555; margin: 0 0 5px 0;">Back:</p>
                        <img src="${postcardData.backImageUrlWithAddress}" alt="Postcard Back" width="400" style="max-width: 100%; width: 400px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); display: block;"/>
                    </td>
                </tr>
                <!-- 5. DIVIDER -->
                <tr>
                    <td align="center" style="padding: 20px 30px;">
                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                            <tr>
                                <td style="border-top: 1px solid #eeeeee;">&nbsp;</td>
                            </tr>
                        </table>
                    </td>
                </tr>
                <!-- 6. SEND AGAIN BUTTON -->
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px;">
                        ${sendAgainButtonHtml}
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
                <!-- 8. PROMO SECTION -->
                ${confirmationEmailConfig.promoImageURL ? `
                <tr>
                    <td align="center" style="padding: 0px 30px 20px 30px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 16px; line-height: 1.5; color: #555555;">
                        <p style="margin: 0 0 10px 0;">${confirmationEmailConfig.promoText}</p>
                        <a href="${confirmationEmailConfig.promoLinkURL || '#'}" target="_blank">
                            <img src="${confirmationEmailConfig.promoImageURL}" alt="Promo Image" width="300" style="max-width: 100%; width: 300px; margin-top: 10px; border-radius: 8px; display: block; margin-left: auto; margin-right: auto;">
                        </a>
                    </td>
                </tr>
                ` : ''}
                <!-- 9. FOOTER -->
                <tr>
                    <td align="center" style="padding: 30px 30px; font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; font-size: 12px; line-height: 1.5; color: #888888;">
                        <p style="margin: 0;">You received this email because you sent a postcard via our service.</p>
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

        const confirmationMsg = {
            to: sender.email,
            from: { email: process.env.SENDGRID_FROM_EMAIL, name: confirmationEmailConfig.senderName },
            subject: subject,
            html: emailHtml
        };
        
        await sgMail.send(confirmationMsg);

        // We already have proto and host, so just build the successUrl
        const successUrl = new URL('/success.html', `${proto}://${host}`);
        
        response.writeHead(302, { Location: successUrl.toString() });
        return response.end();

    } catch (error) {
        console.error('Verify and send error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return response.status(500).send(`<h1>Error</h1><p>Failed to send postcard: ${errorMessage}</p>`);
    }
}