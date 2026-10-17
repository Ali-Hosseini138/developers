/** @type {import('next').NextConfig} */
const backendBase = (
  process.env.DEVELOPER_API_BASE_URL ||
  process.env.HOST_BASE_URL ||
  'https://macil.dev.netboxteam.com'
).replace(/\/$/, '')

const nextConfig = {
  ...(process.env.SELF_HOSTED === '1' ? { output: 'standalone' } : {}),
  // Django API routes require their trailing slash. Avoid redirects that
  // strip it before proxying POST/PATCH multipart requests.
  skipTrailingSlashRedirect: true,
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
}

export default nextConfig
