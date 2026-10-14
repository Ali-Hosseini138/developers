import { NextResponse } from 'next/server'
import { DEVELOPER_API_BASE_URL, getDeveloperAccessToken } from '@/lib/developer-api'

export async function GET() {
  const access = await getDeveloperAccessToken()
  if (!access) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json({
    access,
    baseUrl: DEVELOPER_API_BASE_URL,
  })
}
