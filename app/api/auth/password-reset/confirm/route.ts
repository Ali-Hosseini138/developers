import { developerApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await developerApi('/api/v1/developers/auth/password-reset/confirm/', {
      method: 'POST',
      body: JSON.stringify({ token: body.token, newPassword: body.newPassword }),
    })
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return Response.json({ detail: 'تغییر رمز عبور انجام نشد.' }, { status: 502 })
  }
}
