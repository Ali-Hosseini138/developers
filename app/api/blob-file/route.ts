import { get } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const pathname = new URL(request.url).searchParams.get('pathname')
  if (!pathname || !pathname.startsWith('users/')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isOwnerPath = Boolean(user && pathname.startsWith(`users/${user.id}/`))

  let isPublishedMedia = false
  if (!isOwnerPath) {
    const admin = createAdminClient()
    const { data: publishedApps } = await admin
      .from('apps')
      .select('icon_path, banner_path, screenshot_paths')
      .eq('status', 'published')

    isPublishedMedia = Boolean((publishedApps || []).some((app: Record<string, any>) =>
      app.icon_path === pathname ||
      app.banner_path === pathname ||
      (Array.isArray(app.screenshot_paths) && app.screenshot_paths.includes(pathname)),
    ))
  }

  if (!isOwnerPath && !isPublishedMedia) {
    return NextResponse.json({ error: user ? 'Forbidden' : 'Unauthorized' }, { status: user ? 403 : 401 })
  }

  const result = await get(pathname, {
    access: 'private',
    ifNoneMatch: request.headers.get('if-none-match') ?? undefined,
  })

  if (!result) return new NextResponse('Not found', { status: 404 })

  const cacheControl = isPublishedMedia
    ? 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400'
    : 'private, no-cache'

  if (result.statusCode === 304) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: result.blob.etag, 'Cache-Control': cacheControl },
    })
  }

  return new NextResponse(result.stream, {
    headers: {
      'Content-Type': result.blob.contentType,
      ETag: result.blob.etag,
      'Cache-Control': cacheControl,
    },
  })
}
