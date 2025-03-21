/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:5000'
  },
  images: {
    domains: ['localhost']
  }
}

module.exports = nextConfig 