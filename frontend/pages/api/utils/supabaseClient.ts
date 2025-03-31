import { createClient } from '@supabase/supabase-js';

// Hardcode the values for development (replace with your actual Supabase URL and key)
// In production, you should use environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-project-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

// Log the values to debug (remove in production)
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey ? 'Key exists' : 'Key missing');

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 