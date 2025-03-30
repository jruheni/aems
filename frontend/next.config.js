/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000'
  },
  images: {
    domains: ['localhost']
  },
  webpack: (config) => {
    // This is to handle the Supabase client issue
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    };
    return config;
  },
}

module.exports = nextConfig 