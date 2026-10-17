import type { SupportTicket } from '@/lib/types'

export function ticketError(payload: unknown, fallback = 'ارتباط با سرویس تیکت برقرار نشد. دوباره تلاش کنید.'): string {
  if (!payload || typeof payload !== 'object') return fallback
  const data = payload as Record<string, unknown>
  for (const key of ['detail', 'message', 'error']) if (typeof data[key] === 'string') return data[key]
  for (const value of Object.values(data)) if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return fallback
}

// Only request fixed backend paths; never follow a next URL with bearer credentials.
export async function loadTicketPages(api: (path: string) => Promise<Response>, path: string): Promise<Response> {
  const tickets: unknown[] = []
  for (let page = 1; page <= 1000; page++) {
    const response = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&page_size=200`)
    if (!response.ok) return response
    const payload = await response.json()
    if (page === 1 && Array.isArray(payload)) return Response.json({ tickets: payload })
    if (!Array.isArray(payload.results) || (payload.next && !payload.results.length)) throw new Error('invalid_ticket_page')
    tickets.push(...payload.results)
    if (!payload.next) return Response.json({ tickets })
  }
  throw new Error('ticket_page_limit')
}
