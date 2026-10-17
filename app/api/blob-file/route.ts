import { NextResponse } from 'next/server'
import publicMedia from '@/data/legacy-public-media.json'

export async function GET(request: Request) {
  const pathname = new URL(request.url).searchParams.get('pathname') || ''
  // Only previously published images were migrated to this public allowlist.
  // Private APKs, drafts and identity documents are never served here.
  const target = Object.prototype.hasOwnProperty.call(publicMedia, pathname)
    ? publicMedia[pathname as keyof typeof publicMedia] : undefined
  if (!target) return NextResponse.json({ detail: 'فایل عمومی یافت نشد.' }, { status: 404 })
  return NextResponse.redirect(new URL(target, request.url), 308)
}
