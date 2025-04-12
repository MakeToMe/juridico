/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['studio.rardevops.com'],
  },
  experimental: {
    serverActions: true,
  },
};

module.exports = nextConfig;
