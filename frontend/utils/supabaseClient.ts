import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to empty strings
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';


// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Log to verify the client is created (remove in production)
console.log('Supabase client initialized with URL:', supabaseUrl ? 'Valid URL' : 'Missing URL'); 