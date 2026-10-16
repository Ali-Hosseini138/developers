'use client'

type UploadProgress = (percent: number) => void

type AccessPayload = {
  access: string
  baseUrl: string
}

async function getAccess(forceRefresh = false): Promise<AccessPayload> {
  if (forceRefresh) {
    const response = await fetch('/api/auth/refresh', { method: 'POST' })
    if (!response.ok) throw backendError(await response.json().catch(() => null), response.status)
  }

  const response = await fetch('/api/auth/access-token', { cache: 'no-store' })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search))
    if (response.status === 401) throw new Error('auth_required')
    throw backendError(payload, response.status, response.headers.get('Retry-After'))
  }
  if (typeof payload?.access !== 'string' || !payload.access || typeof payload.baseUrl !== 'string' || !payload.baseUrl) {
    throw backendError({ detail: 'پاسخ سرویس دریافت توکن معتبر نیست. دوباره تلاش کنید.' }, 502)
  }

  return { access: payload.access, baseUrl: payload.baseUrl }
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
    xhr.timeout = 10 * 60 * 1000

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return
      onProgress(Math.max(0, Math.min(100, (event.loaded / event.total) * 100)))
    }

    xhr.onload = () => {
      const payload = parseXhrPayload(xhr)
      if (xhr.status >= 200 && xhr.status < 300) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) { reject(new Error('upload_result_unknown')); return }
        onProgress?.(100)
        resolve(payload)
        return
      }

      reject(backendError(payload, xhr.status, xhr.getResponseHeader('Retry-After')))
    }

    xhr.onerror = () => reject(new Error('upload_result_unknown'))
    xhr.ontimeout = () => reject(new Error('upload_result_unknown'))
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
    try {
      return await sendMultipart(method, path, formData, onProgress, true)
    } catch (retryError) {
      if ((retryError as any)?.status === 401 || (retryError as Error)?.message === 'auth_required') {
        if (typeof window !== 'undefined') window.location.assign('/login?next=' + encodeURIComponent(window.location.pathname + window.location.search))
      }
      throw retryError
    }
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

  if (e?.message === 'auth_required' || e?.status === 401) return 'نشست ورود شما منقضی شده است. دوباره وارد شوید.'
  if (e?.message === 'upload_result_unknown') return 'نتیجه ارسال مشخص نیست. قبل از ارسال دوباره، داشبورد یا اطلاعات اپلیکیشن را تازه کنید تا درخواست تکراری ایجاد نشود.'
  if (e?.message === 'network_error') return 'ارتباط با سرویس برقرار نشد. دوباره تلاش کنید.'
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

export function developerHubFieldErrors(error: unknown): Record<string, string> {
  const payload = (error as { payload?: unknown } | null)?.payload
  if (!payload || typeof payload !== 'object') return {}
  const messages = (value: unknown): string[] => {
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) return value.flatMap(messages)
    if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => messages(item).map(text => /^\d+$/.test(key) ? `تصویر ${Number(key) + 1}: ${text}` : text))
    return []
  }
  return Object.fromEntries(Object.entries(payload)
    .filter(([field]) => !['statusCode', 'code', 'detail', 'message'].includes(field))
    .map(([field, value]) => [field, messages(value).join(' — ')])
    .filter(([, value]) => Boolean(value)))
}
