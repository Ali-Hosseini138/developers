import { readFile } from 'node:fs/promises'
import catalog from '@/data/public-catalog.json'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Optional independent catalog file can be mounted by the server operator.
    // Never fall back to another identity or storage service.
    const data = process.env.PUBLIC_CATALOG_FILE
      ? JSON.parse(await readFile(process.env.PUBLIC_CATALOG_FILE, 'utf8')) : catalog
    if (!Array.isArray(data.apps) || data.apps.some((app: { status?: string }) => app.status !== 'published')) throw new Error('invalid_public_catalog')
    return Response.json({ apps: data.apps, updatedAt: data.updatedAt }, { headers: { 'Cache-Control': 'public, max-age=60' } })
  } catch { return Response.json({ detail: 'دریافت اطلاعات فروشگاه انجام نشد؛ دوباره تلاش کنید.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }) }
}
