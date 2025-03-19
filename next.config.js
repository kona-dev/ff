/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'pics.wikifeet.com' },
      { protocol: 'https', hostname: '*.cloudinary.com' },
      { protocol: 'https', hostname: '*.amazonaws.com' }
    ],
    formats: ['image/webp'],
    minimumCacheTTL: 60
  },
  reactStrictMode: true,
  swcMinify: true
}

module.exports = nextConfig 