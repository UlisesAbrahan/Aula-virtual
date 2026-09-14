
const SUPABASE_URL = "https://mqydolipemycyejowzkg.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_U8FgSmQyLxed3mwmz0X5Sw__CouuT0Q";

// Cliente único compartido por toda la aplicación
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});

const BUCKET_RECURSOS = "recursos";
