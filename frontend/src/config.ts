const config = {
  // API URLs - use environment variables to determine API URL
  apiUrl: process.env.NODE_ENV === 'production' 
    ? 'https://aems.onrender.com' 
    : 'http://localhost:5000',
  
  // Supabase configuration
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  
  // Default settings
  defaultStrictnessLevel: 2,
  maxUploadSizeMB: 10,
  
  // Feature flags
  enableDebugLogging: true,
  enableAutoGrading: true
};

export default config; 