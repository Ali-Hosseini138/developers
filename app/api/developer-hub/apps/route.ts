import { NextResponse } from 'next/server'
import { developerHubApi } from '@/lib/developer-api'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = url.searchParams.get('page') || '1'
  const pageSize = url.searchParams.get('page_size') || '200'
  const response = await developerHubApi(`/api/v1/developer-hub/apps/?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`)
  const payload = await response.json().catch(() => ({}))
  const result = NextResponse.json(payload, { status: response.status })
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) result.headers.set('Retry-After', retryAfter)
  return result
}
