'use client'

type UploadProgress = (percent: number) => void

type AccessPayload = {
  access: string
  baseUrl: string
}

let cachedAccess: AccessPayload | null = null

async function getAccess(forceRefresh = false): Promise<AccessPayload> {
  if (!forceRefresh && cachedAccess) return cachedAccess

  if (forceRefresh) {
    await fetch('/api/auth/refresh', { method: 'POST' }).catch(() => null)
  }

  const response = await fetch('/api/auth/access-token', { cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload?.access || !payload?.baseUrl) {
    throw new Error('auth_required')
  }

  cachedAccess = { access: payload.access, baseUrl: payload.baseUrl }
  return cachedAccess
}

function parseXhrPayload(xhr: XMLHttpRequest) {
  try {
    return xhr.responseText ? JSON.parse(xhr.responseText) : null
  } catch {
    return null
  }
}

function backendError(payload: any, status: number, retryAfter?: string | null) {
  const error = new Error(
    payload?.code ||
    payload?.message ||
    payload?.detail ||
    (status === 413 ? 'file_too_large' : `http_${status}`),
  ) as Error & {
    status?: number
    payload?: any
    retryAfter?: string | null
  }

  error.status = status
  error.payload = payload
  error.retryAfter = retryAfter
  return error
}

async function sendMultipart(
  method: 'POST' | 'PATCH',
  path: string,
  formData: FormData,
  onProgress?: UploadProgress,
  forceRefresh = false,
) {
  const { access, baseUrl } = await getAccess(forceRefresh)

  return new Promise<any>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, `${baseUrl}${path}`)
    xhr.setRequestHeader('Authorization', `Bearer ${access}`)
    xhr.responseType = 'text'

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(Math.max(0, Math.min(100, (event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      const payload = parseXhrPayload(xhr)
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100)
        resolve(payload)
        return
      }

      reject(backendError(payload, xhr.status, xhr.getResponseHeader('Retry-After')))
    }

    xhr.onerror = () => reject(new Error('network_error'))
    xhr.onabort = () => reject(new Error('upload_aborted'))
    xhr.send(formData)
  })
}

async function multipartWithRefresh(
  method: 'POST' | 'PATCH',
  path: string,
  formData: FormData,
  onProgress?: UploadProgress,
) {
  try {
    return await sendMultipart(method, path, formData, onProgress)
  } catch (error) {
    if ((error as any)?.status !== 401) throw error
    cachedAccess = null
    return sendMultipart(method, path, formData, onProgress, true)
  }
}

export function postDeveloperHubMultipart(path: string, formData: FormData, onProgress?: UploadProgress) {
  return multipartWithRefresh('POST', path, formData, onProgress)
}

export function patchDeveloperHubMultipart(path: string, formData: FormData, onProgress?: UploadProgress) {
  return multipartWithRefresh('PATCH', path, formData, onProgress)
}

export function developerHubErrorMessage(error: unknown, fallback: string) {
  const e = error as Error & { payload?: any; status?: number; retryAfter?: string | null }
  const payload = e?.payload

  if (e?.message === 'auth_required') return 'نشست ورود شما منقضی شده است. دوباره وارد شوید.'
  if (e?.message === 'network_error') return 'ارتباط با سرویس بک‌اند برقرار نشد. اتصال شبکه و CORS بک‌اند را بررسی کنید.'
  if (e?.message === 'file_too_large' || e?.status === 413) return 'حجم فایل از سقف مجاز سرور بیشتر است.'
  if (e?.status === 429) {
    const seconds = Number(e.retryAfter || 0)
    if (Number.isFinite(seconds) && seconds > 0) {
      const minutes = Math.max(1, Math.ceil(seconds / 60))
      return 'سقف ارسال فایل در این ساعت پر شده است. حدود ' + minutes.toLocaleString('fa-IR') + ' دقیقه دیگر دوباره تلاش کنید.'
    }
    return 'سقف ارسال فایل در این ساعت پر شده است. کمی بعد دوباره تلاش کنید.'
  }

  if (payload?.message) return String(payload.message)
  if (payload?.detail) return String(payload.detail)

  if (payload && typeof payload === 'object') {
    for (const [field, value] of Object.entries(payload)) {
      if (field === 'statusCode') continue
      if (Array.isArray(value) && value.length) return `${field}: ${String(value[0])}`
      if (value && typeof value === 'object') {
        const nested = Object.values(value as Record<string, unknown>)
        const first = nested.flatMap((item) => Array.isArray(item) ? item : []).find(Boolean)
        if (first) return `${field}: ${String(first)}`
      }
    }
  }

  return fallback
}
