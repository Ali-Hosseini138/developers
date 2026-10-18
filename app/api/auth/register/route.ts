import { developerApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request) {
  let body: string | FormData
  try {
    if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
      const form = await request.formData()
      const cards = form.getAll('identity_document_image')
      const card = cards[0]
      if (cards.length > 1 || (card != null && (typeof card === 'string' || form.get('accountType') !== 'legal' ||
          !['image/png', 'image/jpeg'].includes(card.type) || card.size === 0 || card.size > 2 * 1024 * 1024))) {
        return Response.json({ identity_document_image: ['تصویر کارت ملی مدیرعامل باید PNG یا JPEG غیرخالی و حداکثر ۲ مگابایت باشد و فقط برای شخص حقوقی ارسال شود.'] }, { status: 400 })
      }
      body = form
    } else {
      const payload = await request.json()
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return Response.json({ detail: 'درخواست ثبت‌نام معتبر نیست.' }, { status: 400 })
      body = JSON.stringify(payload)
    }
  } catch {
    return Response.json({ detail: 'درخواست ثبت‌نام معتبر نیست.' }, { status: 400 })
  }
  try {
    const response = await developerApi('/api/v1/developers/auth/register/', {
      method: 'POST',
      body,
    })
    const payload = await response.json().catch(() => ({ detail: 'پاسخ نامعتبر از سرویس احراز هویت.' }))
    return copyBackendResponse(response, payload)
  } catch {
    return Response.json({ detail: 'ارتباط با سرویس ثبت‌نام برقرار نشد.' }, { status: 502 })
  }
}

