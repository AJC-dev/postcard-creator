import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

const fallbackConfig = {
  content: {
    pageTitle: "SixStarCruises - Send Free Postcards",
    faviconURL: "ssc_favicon.ico",
    loadingImageURL: "https://i.gifer.com/ZZ5H.gif",
    mainTitle: "Send holiday postcards home now.",
    subtitleText: "Upload pics, add a message and we'll post them for you tomorrow. A free service from",
    subtitleLinkText: "Six Star Cruises",
    subtitleLinkURL: "https://www.sixstarcruises.co.uk/"
  },
  styles: {
    titleColor: "#b9965b",
    subtitleLinkColor: "#b9965b",
    uploadButtonColor: "#b9965b",
    uploadButtonTextColor: "#FFFFFF",
    findImageButtonColor: "#212529",
    findImageButtonTextColor: "#FFFFFF",
    sendPostcardButtonColor: "#212529",
    sendPostcardButtonTextColor: "#FFFFFF"
  },
  email: {
    senderName: "Six Star Cruises",
    subject: "Your Postcard Proof for {{recipientName}}",
    body: "Hi {{senderName}}, here is the final proof of your postcard. Please click the link to confirm and send."
  },
  confirmationEmail: {
    senderName: "Six Star Cruises Team",
    subject: "Your Postcard to {{recipientName}} has been sent!",
    body: "Hi {{senderName}}, thank you for using our service. Your postcard is on its way.",
    promoText: "Savings Event",
    promoLinkURL: "https://www.sixstarcruises.co.uk/",
    promoImageURL: "sixstars.png"
  },
  successPage: {
    pageTitle: "Success!",
    faviconURL: "ssc_favicon.ico",
    heading: "Postcard Sent!",
    headingColor: "#b9965b",
    subheading: "Your postcard is on its way.",
    buttonText: "Send Another",
    buttonColor: "#b9965b",
    buttonTextColor: "#FFFFFF",
    promoText: "Book your next cruise",
    promoLinkURL: "https://www.sixstarcruises.co.uk/",
    promoImageURL: "sixstars.png"
  },
  postcardPromo: {
    imageURL: "https://via.placeholder.com/500x500"
  },
  limits: {
    postcardLimit: 1,
    limitDays: 7
  }
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    return response.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('configuration')
      .select('settings')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error fetching configuration:', error);
      return response.status(200).json(fallbackConfig);
    }

    return response.status(200).json(data.settings || fallbackConfig);
  } catch (error) {
    console.error('Error in get-config:', error);
    return response.status(200).json(fallbackConfig);
  }
}
