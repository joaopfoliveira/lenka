/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/lenka', // Hardcoded for deployment
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;

