import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'

const datePattern = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const appId = url.searchParams.get('appId') || 'all'
  const start = url.searchParams.get('start') || ''
  const end = url.searchParams.get('end') || ''

  if (!datePattern.test(start) || !datePattern.test(end) || start > end) {
    return NextResponse.json({ error: 'invalid_date_range' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: ownedApps, error: appsError } = await supabase
    .from('apps')
    .select('id, netbox_payment_integrated')
    .eq('owner_id', identity.id)
    .eq('status', 'published')

  if (appsError) return NextResponse.json({ error: 'apps_load_failed' }, { status: 500 })

  const ownedIds = (ownedApps || []).map((app) => app.id)
  const selectedIds = appId === 'all'
    ? ownedIds
    : ownedIds.includes(appId)
      ? [appId]
      : []

  if (appId !== 'all' && selectedIds.length === 0) {
    return NextResponse.json({ error: 'app_not_found' }, { status: 404 })
  }

  if (selectedIds.length === 0) {
    return NextResponse.json({ installs: [], sales: [] })
  }

  let installsQuery = supabase
    .from('app_daily_installs')
    .select('app_id, metric_date, installs')
    .gte('metric_date', start)
    .lte('metric_date', end)
    .order('metric_date', { ascending: true })

  installsQuery = selectedIds.length === 1
    ? installsQuery.eq('app_id', selectedIds[0])
    : installsQuery.in('app_id', selectedIds)

  const paymentIds = (ownedApps || [])
    .filter((app) => selectedIds.includes(app.id) && app.netbox_payment_integrated)
    .map((app) => app.id)

  const salesPromise = paymentIds.length
    ? (() => {
        let query = supabase
          .from('app_daily_sales')
          .select('app_id, metric_date, orders, total_sales_rial')
          .gte('metric_date', start)
          .lte('metric_date', end)
          .order('metric_date', { ascending: true })

        query = paymentIds.length === 1
          ? query.eq('app_id', paymentIds[0])
          : query.in('app_id', paymentIds)

        return query
      })()
    : Promise.resolve({ data: [], error: null })

  const [installsResult, salesResult] = await Promise.all([installsQuery, salesPromise])

  if (installsResult.error || salesResult.error) {
    return NextResponse.json({ error: 'analytics_load_failed' }, { status: 500 })
  }

  return NextResponse.json({
    installs: installsResult.data || [],
    sales: salesResult.data || [],
  })
}
