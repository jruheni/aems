const config = {
  // API URLs
  apiUrl: 'http://localhost:5000',
  backupApiUrl: 'http://127.0.0.1:5000',
  
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