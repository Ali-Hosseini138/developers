import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
const apkType = 'application/vnd.android.package-archive'
const maxApkSize = 250 * 1024 * 1024
const maxImageSize = 8 * 1024 * 1024

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: 'Invalid upload request' }, { status: 400 })
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`users/${user.id}/`)) {
          throw new Error('Forbidden upload path')
        }

        const isApk = pathname.toLowerCase().endsWith('.apk')

        return {
          allowedContentTypes: isApk ? [apkType] : imageTypes,
          maximumSizeInBytes: isApk ? maxApkSize : maxImageSize,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: user.id }),
        }
      },
      onUploadCompleted: async () => {
        // No database mutation is needed here. The submitted app stores the
        // returned private Blob pathname after all uploads complete.
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    )
  }
}
