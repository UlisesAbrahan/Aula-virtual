// =====================================================================
// CONFIGURACIÓN DE SUPABASE
// Reemplazá los valores de abajo por los de TU proyecto:
// Supabase > Project Settings > API
// Usá SIEMPRE la "anon / public key". NUNCA la "service_role key" acá.
// =====================================================================
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
