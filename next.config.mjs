/** @type {import('next').NextConfig} */
const backendBase = (
  process.env.DEVELOPER_API_BASE_URL ||
  process.env.HOST_BASE_URL ||
  'https://macil.dev.netboxteam.com'
).replace(/\/$/, '')

const nextConfig = {
  // Django API routes require their trailing slash. Avoid redirects that
  // strip it before proxying POST/PATCH multipart requests.
  skipTrailingSlashRedirect: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/backend-api/:path*',
        destination: backendBase + '/:path*/',
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/backend-api/:path*',
        headers: [
          { key: 'x-vercel-enable-rewrite-caching', value: '0' },
        ],
      },
    ]
  },
}

export default nextConfig
