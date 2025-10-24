export default async function handler(request, response) {
  return response.status(200).json({
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY,
    hasSendGridKey: !!process.env.SENDGRID_API_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
    supabaseUrlLength: process.env.SUPABASE_URL?.length || 0,
    supabaseKeyLength: process.env.SUPABASE_SERVICE_KEY?.length || 0
  });
}
