import { developerApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await developerApi('/api/v1/developers/auth/resend-verification/', {
      method: 'POST',
      body: JSON.stringify({ email: body.email }),
    })
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return Response.json({ detail: 'ارسال دوباره ایمیل تأیید انجام نشد.' }, { status: 502 })
  }
}
