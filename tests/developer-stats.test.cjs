const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(path, mocks = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: mod, exports: mod.exports, require: name => mocks[name], Response, Request, Headers, URL, URLSearchParams })
  return mod.exports
}
const stats = load('lib/developer-stats.ts')
test('stats sends calendar periods unchanged and custom ranges as exact camelCase dates', () => {
  assert.equal(stats.statsQuery(new URLSearchParams('period=3m')), 'period=3m')
  assert.equal(stats.statsQuery(new URLSearchParams('startDate=2026-10-01&endDate=2026-10-15'), '2026-10-15'), 'startDate=2026-10-01&endDate=2026-10-15')
  assert.equal(stats.statsQuery(new URLSearchParams()), 'period=1m')
})
test('invalid, future, mixed, reversed or oversized ranges are rejected', () => {
  for (const query of ['period=90', 'period=1m&startDate=2026-10-01', 'startDate=2026-02-30&endDate=2026-03-01', 'startDate=2026-10-01', 'endDate=2026-10-01', 'startDate=2026-10-16&endDate=2026-10-15', 'startDate=2026-10-01&endDate=2026-10-16', 'startDate=2025-10-14&endDate=2026-10-15']) {
    assert.throws(() => stats.statsQuery(new URLSearchParams(query), '2026-10-15'), undefined, query)
  }
  assert.ok(stats.statsQuery(new URLSearchParams('startDate=2025-10-15&endDate=2026-10-15'), '2026-10-15'))
})
test('time-series retains negative changes and gaps, while null never becomes zero', () => {
  const result = stats.datedSegments([{ date: '2026-10-01', value: null }, { date: '2026-10-02', value: -11 }, { date: '2026-10-03', value: 0 }, { date: '2026-10-05', value: 5 }])
  assert.equal(JSON.stringify(result), JSON.stringify([[{ date: '2026-10-02', value: -11 }, { date: '2026-10-03', value: 0 }], [{ date: '2026-10-05', value: 5 }]]))
})
test('download filenames support UTF-8 and strip path and control characters', () => {
  assert.equal(stats.exportFileName('attachment; filename="install-stats_test.xlsx"'), 'install-stats_test.xlsx')
  assert.equal(stats.exportFileName("attachment; filename*=UTF-8''%D9%86%D8%B5%D8%A8.xlsx"), 'نصب.xlsx')
  assert.ok(!stats.exportFileName('attachment; filename="../report.xlsx"').includes('/'))
})
function proxy(reply) {
  let path = ''
  const { proxyDeveloperStats } = load('lib/developer-stats-proxy.ts', {
    '@/lib/developer-stats': stats,
    '@/lib/developer-api': {
      developerHubApi: async value => { path = value; return reply() },
      copyBackendResponse: (response, payload) => Response.json(payload, { status: response.status, headers: response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After') } : {} }),
    },
  })
  return { run: (query = 'period=3m', file = false) => proxyDeveloperStats(new Request('http://localhost/stats?' + query), '42', file), path: () => path }
}
test('stats proxy uses developer auth helper and the exact slash-terminated endpoint', async () => {
  const p = proxy(() => Response.json({ appId: 42, points: [] }))
  assert.equal((await p.run()).status, 200)
  assert.equal(p.path(), '/api/v1/developer-hub/apps/42/stats/?period=3m')
})
test('Excel proxy streams bytes and preserves attachment name without exposing tokens', async () => {
  const p = proxy(() => new Response(new Uint8Array([80, 75, 3, 4]), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="stats.xlsx"' } }))
  const response = await p.run('startDate=2026-10-01&endDate=2026-10-02', true)
  assert.equal(p.path(), '/api/v1/developer-hub/apps/42/stats/export/?startDate=2026-10-01&endDate=2026-10-02')
  assert.equal(response.headers.get('Content-Disposition'), 'attachment; filename="stats.xlsx"')
  assert.deepEqual(Array.from(new Uint8Array(await response.arrayBuffer())), [80, 75, 3, 4])
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
})
test('JSON errors and unexpected JSON success never become Excel downloads', async () => {
  const denied = proxy(() => Response.json({ detail: 'expired' }, { status: 401 }))
  assert.equal((await denied.run('period=1m', true)).status, 401)
  const unexpected = proxy(() => Response.json({ detail: 'not a file' }))
  assert.equal((await unexpected.run('period=1m', true)).status, 502)
  const invalid = proxy(() => { throw Error('must not call upstream') })
  assert.equal((await invalid.run('period=90')).status, 400)
  const unavailable = proxy(() => { throw Error('network') })
  assert.equal((await unavailable.run()).status, 502)
})
test('payment statuses and naive UTC timestamps match the new contract', () => {
  const payment = load('lib/payment-deadline.ts')
  assert.equal(payment.paymentStatusLabels.missing_deadline, 'بدون تاریخ مهلت')
  assert.equal(payment.utcPaymentDate('2026-10-15T10:00:00.000000'), '2026-10-15T10:00:00.000000Z')
  assert.equal(payment.utcPaymentDate('2026-10-15T10:00:00+03:30'), '2026-10-15T10:00:00+03:30')
  const sorted = payment.sortPaymentDeadlines([{ id: 2, deadlineAt: null }, { id: 1, deadlineAt: '2026-10-15T10:00:00' }])
  assert.equal(sorted[0].id, 1)
})
test('install count and publication eligibility survive a pending app update', () => {
  const model = load('lib/developer-hub-model.ts')
  const app = model.mapDeveloperHubApp({ id: 42, name: 'App', isPublished: true, installCount: 1234, latestSubmission: { id: 7, status: 'pending_review' } })
  assert.equal(app.downloads, 1234)
  assert.equal(app.isPublished, true)
  assert.equal(app.status, 'pending')
})
