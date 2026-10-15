import { proxyDeveloperStats } from '@/lib/developer-stats-proxy'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return proxyDeveloperStats(request, (await params).id, true)
}
