import { developerApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await developerApi('/api/v1/developers/auth/register/', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({ detail: 'پاسخ نامعتبر از سرویس احراز هویت.' }))
    return copyBackendResponse(response, payload)
  } catch {
    return Response.json({ detail: 'ارتباط با سرویس ثبت‌نام برقرار نشد.' }, { status: 502 })
  }
}
