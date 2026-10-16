import { NextResponse } from 'next/server'
import { getDeveloperAccessToken } from '@/lib/developer-api'

export async function GET() {
  try {
    const access = await getDeveloperAccessToken()
    if (!access) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    return NextResponse.json({
      access,
      baseUrl: '/backend-api',
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ detail: 'ارتباط با سرویس تمدید نشست برقرار نشد؛ دوباره تلاش کنید.' }, { status: 502, headers: { 'Cache-Control': 'private, no-store' } })
  }
}
