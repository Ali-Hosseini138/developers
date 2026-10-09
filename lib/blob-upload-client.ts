'use client'

import { upload } from '@vercel/blob/client'

export type UploadedPrivateFile = {
  pathname: string
  name: string
  size: number
  contentType: string
}

const APK_TYPE = 'application/vnd.android.package-archive'
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const MAX_APK_SIZE = 250 * 1024 * 1024
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

export async function uploadPrivateFile(userId: string, file: File, onProgress?: (percentage: number) => void): Promise<UploadedPrivateFile> {
  if (!userId) throw new Error('auth_required')

  const isApk = file.name.toLowerCase().endsWith('.apk')
  if (isApk && file.size > MAX_APK_SIZE) throw new Error('apk_too_large')
  if (isApk) {
    const signature = new Uint8Array(await file.slice(0, 4).arrayBuffer())
    const isZip = signature[0] === 0x50 && signature[1] === 0x4b && signature[2] === 0x03 && signature[3] === 0x04
    if (!isZip) throw new Error('invalid_apk_file')
  }
  if (!isApk && !IMAGE_TYPES.has(file.type)) throw new Error('unsupported_image_type')
  if (!isApk && file.size > MAX_IMAGE_SIZE) throw new Error('image_too_large')

  const safeName = file.name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || (isApk ? 'app.apk' : 'image')

  const contentType = isApk ? APK_TYPE : file.type
  const pathname = `users/${userId}/${crypto.randomUUID()}-${safeName}`

  const blob = await upload(pathname, file, {
    access: 'private',
    handleUploadUrl: '/api/blob-upload',
    contentType,
    multipart: isApk && file.size > 10 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress?.(percentage),
  })

  return {
    pathname: blob.pathname,
    name: file.name,
    size: file.size,
    contentType,
  }
}
