const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { resolve } = require('node:path')
function load(path, mocks, globals = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText,
    { module: mod, exports: mod.exports, require: name => name in mocks ? mocks[name] : require(name), URLSearchParams, AbortController, Date, ...globals })
  return mod.exports
}
const stats = load('lib/developer-stats.ts', {})
function all(node, match) { if (!node || typeof node !== 'object') return []; return [...(match(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, match))] }
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node === 'object' ? [node.props?.children].flat(Infinity).map(text).join('') : String(node) }
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(setImmediate) }
function fixture(fetcher) {
  let state = ['42', '3m', '', '', null, false, '', false, '', 0], cursor = 0, refs = [], refIndex = 0, effects = []
  const downloads = [], urls = [], requests = [], location = []
  const hooks = { useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => state[i] = typeof value === 'function' ? value(state[i]) : value] }, useMemo: fn => fn(), useRef: initial => { const i = refIndex++; return refs[i] || (refs[i] = { current: initial }) }, useEffect: fn => effects.push(fn) }
  function Button() {}; function Input() {}; function Label() {}
  const ui = load('components/developer-install-stats.tsx', { react: hooks, '@/components/ui/button': { Button }, '@/components/ui/input': { Input }, '@/components/ui/label': { Label }, '@/lib/developer-stats': stats }, {
    fetch: async (url, options) => { requests.push([url, options]); return fetcher(url, options) },
    window: { location: { assign: url => location.push(url) }, setTimeout: fn => fn() },
    URL: { createObjectURL: blob => { urls.push(blob); return 'blob:test' }, revokeObjectURL() {} },
    document: { body: { appendChild() {} }, createElement: () => { const anchor = { click() { downloads.push({ href: anchor.href, name: anchor.download }) }, remove() {} }; return anchor } },
  })
  const payload = { appId: 42, period: '3m', startDate: '2026-07-15', endDate: '2026-10-15', points: [{ date: '2026-10-01', installCount: 10, change: null }, { date: '2026-10-03', installCount: 5, change: -5 }], summary: { currentInstallCount: 5, startInstallCount: 10, endInstallCount: 5, netChange: -5, averageDailyChange: -5, peakDailyChange: -5, peakDate: '2026-10-03', daysWithData: 2, daysInRange: 93 } }
  const apps = [{ id: '42', name: 'App', isPublished: true, status: 'pending' }]
  function render() { cursor = 0; refIndex = 0; effects = []; return ui.DeveloperInstallStats({ myApps: apps }) }
  return { render, setData: () => state[4] = { key: '42?period=3m', data: payload }, Button, requests, downloads, urls, state, ui, getEffects: () => effects, payload, location }
}
test('published apps with pending updates show real negative stats, coverage warning and download', () => {
  const f = fixture(); f.setData(); const tree = f.render()
  assert.ok(text(tree).includes('نام اپلیکیشن'))
  assert.ok(text(tree).includes('فاصله‌های نمودار به معنی صفر نصب نیستند'))
  assert.ok(text(tree).includes('−۵') || text(tree).includes('-۵'))
  const button = all(tree, node => node.type === f.Button && text(node) === 'خروجی اکسل روند نصب')[0]
  assert.equal(button.props.disabled, false)
})
test('stats effect fetches the exact per-app period endpoint', async () => {
  const f = fixture(() => Response.json(f.payload)); f.render()
  const cleanup = f.getEffects()[1](); await flush()
  assert.equal(f.requests[0][0], '/api/developer-hub/apps/42/stats?period=3m')
  assert.equal(f.state[4].data.appId, 42)
  cleanup()
})
test('Excel downloads use backend filename and never save JSON errors as files', async () => {
  for (const ok of [true, false]) {
    const f = fixture(() => ok ? new Response(new Blob(['PK']), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="actual.xlsx"' } }) : Response.json({ detail: 'range rejected' }, { status: 400 }))
    f.setData(); const tree = f.render()
    all(tree, node => node.type === f.Button && text(node) === 'خروجی اکسل روند نصب')[0].props.onClick(); await flush()
    assert.equal(f.requests[0][0], '/api/developer-hub/apps/42/stats/export?period=3m')
    assert.equal(f.downloads.length, ok ? 1 : 0)
    if (ok) assert.equal(f.downloads[0].name, 'actual.xlsx')
    else assert.equal(f.state[8], 'range rejected')
  }
})
test('an export finishing after the filter changes cannot download stale data', async () => {
  let release
  const f = fixture(() => new Promise(resolve => { release = resolve })); f.setData(); const tree = f.render()
  all(tree, node => node.type === f.Button && text(node) === 'خروجی اکسل روند نصب')[0].props.onClick()
  f.state[1] = '6m'; f.render()
  release(new Response(new Blob(['PK']), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } }))
  await flush(); assert.equal(f.downloads.length, 0)
})
test('time-axis charts preserve negative values and visibly separate missing dates', () => {
  const f = fixture()
  const tree = f.ui.InstallChart({ title: 'Chart', start: '2026-10-01', end: '2026-10-05', points: [{ date: '2026-10-01', value: -10 }, { date: '2026-10-03', value: 20 }, { date: '2026-10-04', value: 5 }] })
  const circles = all(tree, node => node.type === 'circle')
  assert.ok(circles[0].props.cy > circles[1].props.cy)
  assert.equal(circles[1].props.cx - circles[0].props.cx, 335)
  assert.equal(all(tree, node => node.type === 'polyline').length, 2)
})
