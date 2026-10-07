import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const imageTypes = ['image/png', 'image/jpeg', 'image/webp']
const apkType = 'application/vnd.android.package-archive'
const maxApkSize = 250 * 1024 * 1024
const maxImageSize = 8 * 1024 * 1024

export async function POST(request: Request) {
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
        // Authentication belongs here, not at the top of the route.
        // Vercel Blob calls this same endpoint after the upload completes,
        // and that server-to-server callback does not carry the user's cookies.
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          throw new Error('Unauthorized')
        }

        if (!pathname.startsWith(`users/${user.id}/`)) {
          throw new Error('Forbidden upload path')
        }

        const isApk = pathname.toLowerCase().endsWith('.apk')

        return {
          allowedContentTypes: isApk ? [apkType] : imageTypes,
          maximumSizeInBytes: isApk ? maxApkSize : maxImageSize,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: user.id, pathname }),
        }
      },
      onUploadCompleted: async () => {
        // The upload is already complete. No database mutation is needed here;
        // the app submission stores the private Blob pathname afterwards.
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
