import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const allowedTypes = new Set(['application/vnd.android.package-archive', 'image/png', 'image/jpeg', 'image/webp'])
const maxSizes: Record<string, number> = {
  'application/vnd.android.package-archive': 250 * 1024 * 1024,
  'image/png': 8 * 1024 * 1024,
  'image/jpeg': 8 * 1024 * 1024,
  'image/webp': 8 * 1024 * 1024,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || !allowedTypes.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file' }, { status: 400 })
  }
  if (file.size > (maxSizes[file.type] ?? 0)) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
  const blob = await put(`users/${user.id}/${crypto.randomUUID()}-${safeName}`, file, {
    access: 'private',
  })
  return NextResponse.json({ pathname: blob.pathname, name: file.name, size: file.size, contentType: file.type })
}
