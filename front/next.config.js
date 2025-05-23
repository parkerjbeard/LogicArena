/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Define env variables to be used in the frontend
  env: {
    API_URL: process.env.API_URL || 'http://localhost:8000',
    WS_URL: process.env.WS_URL || 'ws://localhost:8000',
  },
  // Configure CORS headers for API requests
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.API_URL ? `${process.env.API_URL}/api/:path*` : 'http://gateway:8000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig 