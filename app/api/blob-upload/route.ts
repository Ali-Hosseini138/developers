import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const imageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])
const maxApkSize = 250 * 1024 * 1024
const maxImageSize = 8 * 1024 * 1024

function looksLikeZip(fileHeader: Uint8Array) {
  return fileHeader.length >= 4 &&
    fileHeader[0] === 0x50 &&
    fileHeader[1] === 0x4b &&
    (
      (fileHeader[2] === 0x03 && fileHeader[3] === 0x04) ||
      (fileHeader[2] === 0x05 && fileHeader[3] === 0x06) ||
      (fileHeader[2] === 0x07 && fileHeader[3] === 0x08)
    )
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const isApk = file.name.toLowerCase().endsWith('.apk')
  const isImage = imageTypes.has(file.type)

  if (!isApk && !isImage) {
    return NextResponse.json({ error: 'Unsupported file' }, { status: 400 })
  }

  const maxSize = isApk ? maxApkSize : maxImageSize
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  if (isApk) {
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    if (!looksLikeZip(header)) {
      return NextResponse.json({ error: 'Invalid APK file' }, { status: 400 })
    }
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const blob = await put(`users/${user.id}/${crypto.randomUUID()}-${safeName}`, file, {
    access: 'private',
    contentType: isApk ? 'application/vnd.android.package-archive' : file.type,
  })

  return NextResponse.json({
    pathname: blob.pathname,
    name: file.name,
    size: file.size,
    contentType: isApk ? 'application/vnd.android.package-archive' : file.type,
  })
}
