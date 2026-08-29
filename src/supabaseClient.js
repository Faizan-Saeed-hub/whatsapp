import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const rawKey = 
    import.meta.env.VITE_SUPABASE_KEY || 
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    import.meta.env.VITE_SUPABASE_ANON_KEY || 
    '';

// Clean and sanitize URL and Key to prevent invalid header / fetch exceptions
const supabaseUrl = String(rawUrl).trim().replace(/^["']|["']$/g, '');
const supabaseKey = String(rawKey).trim().replace(/^["']|["']$/g, '');

export const supabase = createClient(
    supabaseUrl || 'https://ruthfktdlchsvcwwtwef.supabase.co', 
    supabaseKey || 'sb_publishable_XsfqCiA36L3X8-Smg7IqcQ_wZk2au2k',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        }
    }
);