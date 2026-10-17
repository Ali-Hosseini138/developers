const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
function load(file, mocks = {}, globals = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(compile(fs.readFileSync(file, 'utf8')), { module: mod, exports: mod.exports, require: key => key in mocks ? mocks[key] : require(key), Response, Request, Headers, URL, URLSearchParams, AbortSignal, FormData, ...globals })
  return mod.exports
}
const flush = async () => { for (let n = 0; n < 12; n++) await new Promise(setImmediate) }
const safe = load('lib/safe-navigation.ts').safeInternalPath
test('login and callback navigation reject external, backslash and control-character destinations', () => {
  for (const path of ['https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example', '/\t/evil.example', '/ /evil.example', null]) assert.equal(safe(path), '/dashboard')
  assert.equal(safe('/dashboard?tab=support'), '/dashboard?tab=support')
  assert.equal(safe('/dashboard/edit/42'), '/dashboard/edit/42')
})
function session(apiResponse) {
  const mutations = []
  const handler = load('app/api/auth/session/route.ts', {
    'next/headers': { cookies: async () => ({ get: name => ({ value: name === 'refresh' ? 'valid-refresh' : name === 'email' ? 'dev@example.com' : 'signed' }) }) },
    'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status || 200, body, headers: new Headers(init?.headers), cookies: { set: (...args) => mutations.push(args) } }) } },
    '@/lib/developer-api': { developerApi: async () => apiResponse.clone(), ACCESS_COOKIE: 'access', EMAIL_COOKIE: 'email', REFRESH_COOKIE: 'refresh', authCookieOptions: () => ({ httpOnly: true }) },
    '@/lib/developer-profile': { mapDeveloperProfile: value => ({ ...value, id: String(value.id) }) },
  }).GET
  return { handler, mutations }
}
test('session outages and rate limits preserve cookies and error status instead of logging out', async () => {
  for (const status of [429, 500, 502, 503]) {
    const f = session(Response.json({ detail: 'temporarily unavailable' }, { status, headers: { 'Retry-After': '20' } }))
    const response = await f.handler()
    assert.equal(response.status, status)
    assert.equal(f.mutations.length, 0)
    assert.equal(response.headers.get('Retry-After'), '20')
  }
})
test('a successful refresh with malformed access does not erase valid refresh cookies', async () => {
  for (const payload of [{}, { access: '' }, { access: 42 }]) {
    const f = session(Response.json(payload))
    assert.equal((await f.handler()).status, 502)
    assert.equal(f.mutations.length, 0)
  }
})
test('an explicitly invalid refresh still clears every session cookie', async () => {
  const f = session(Response.json({ detail: 'expired' }, { status: 401 }))
  assert.equal((await f.handler()).status, 401)
  assert.equal(f.mutations.length, 4)
})
test('developer and staff refresh outages cannot be misreported as missing authentication', async () => {
  for (const kind of ['developer', 'admin']) {
    const cookies = { get: () => ({ value: 'refresh' }), set() {} }
    let attempts = 0
    const api = async () => { attempts++; return Response.json({ detail: 'outage' }, { status: 503 }) }
    const mocks = { 'next/headers': { cookies: async () => cookies }, 'next/server': { NextResponse: Response }, '@/lib/developer-api': { developerApi: api, authCookieOptions: () => ({}) } }
    if (kind === 'developer') {
      cookies.get = name => name === 'developer_refresh' ? { value: 'refresh' } : undefined
      const lib = load('lib/developer-api.ts', mocks, { fetch: api, process: { env: {} } })
      await assert.rejects(lib.developerHubApi('/api/v1/developer-hub/apps/'), /token_refresh_unavailable/)
    } else {
      cookies.get = name => name === 'developer_hub_admin_refresh' ? { value: 'refresh' } : undefined
      const lib = load('lib/admin-auth.ts', mocks)
      await assert.rejects(lib.adminHubApi('/api/v1/developer-hub/admin/tickets/'), /token_refresh_unavailable/)
    }
    assert.equal(attempts, 1)
  }
})
test('multipart gets fresh credentials for each request, including a same-tab account change', async () => {
  let account = 'alice', accessReads = 0
  const requests = []
  class XHR {
    upload = {}; status = 201; responseText = '{"id":42}'
    open(method, path) { this.method = method; this.path = path }
    setRequestHeader(key, value) { requests.push(value) }
    getResponseHeader() { return null }
    send() { this.onload() }
  }
  const client = load('lib/developer-hub-client.ts', {}, { XMLHttpRequest: XHR, fetch: async () => { accessReads++; return Response.json({ access: account, baseUrl: '/backend-api' }) } })
  await client.postDeveloperHubMultipart('/api/v1/developer-hub/apps/', new FormData())
  account = 'bob'
  await client.patchDeveloperHubMultipart('/api/v1/developer-hub/apps/42/', new FormData())
  assert.deepEqual(requests, ['Bearer alice', 'Bearer bob'])
  assert.equal(accessReads, 2)
})
test('lost upload responses are bounded and instruct verification before resubmission', async () => {
  let timeout
  class XHR {
    upload = {}; open() {}; setRequestHeader() {}
    send() { timeout = this.timeout; this.ontimeout() }
  }
  const client = load('lib/developer-hub-client.ts', {}, { XMLHttpRequest: XHR, fetch: async () => Response.json({ access: 'token', baseUrl: '/backend-api' }) })
  let failure
  try { await client.postDeveloperHubMultipart('/api/v1/developer-hub/apps/', new FormData()) } catch (error) { failure = error }
  assert.equal(timeout, 600000)
  assert.ok(client.developerHubErrorMessage(failure, 'fallback').includes('قبل از ارسال دوباره'))
})
function hooks() {
  let cursor = 0, values = [], pending = []
  const equal = (a, b) => a && b && a.length === b.length && a.every((item, i) => Object.is(item, b[i]))
  const api = {
    createContext: () => ({ Provider: 'provider' }), useContext() {},
    useState(initial) { const i = cursor++; values[i] ??= { value: typeof initial === 'function' ? initial() : initial }; return [values[i].value, next => values[i].value = typeof next === 'function' ? next(values[i].value) : next] },
    useRef(initial) { const i = cursor++; return values[i] || (values[i] = { current: initial }) },
    useMemo(fn, deps) { const i = cursor++; if (!values[i] || !equal(values[i].deps, deps)) values[i] = { value: fn(), deps }; return values[i].value },
    useCallback(fn, deps) { return api.useMemo(() => fn, deps) },
    useEffect(fn, deps) { const i = cursor++; if (!values[i] || !equal(values[i].deps, deps)) { values[i] = { deps }; pending.push(fn) } },
  }
  return { api, begin() { cursor = 0 }, effects() { const effects = pending; pending = []; return effects } }
}
function store(fetcher) {
  const h = hooks(), redirects = []
  const model = load('lib/developer-hub-model.ts')
  const provider = load('components/store-provider.tsx', { react: h.api,
    '@/lib/support-tickets': load('lib/support-tickets.ts'), '@/lib/developer-hub-model': model,
  }, { fetch: fetcher, window: { location: { assign: value => redirects.push(value) }, setInterval() {}, clearInterval() {} } }).StoreProvider
  const render = () => { h.begin(); return provider({ children: null }).props.value }
  return { render, mount() { render(); for (const effect of h.effects()) effect() }, redirects }
}
test('app-list transport failure preserves a valid session and reports a retryable list error', async () => {
  const f = store(async path => {
    if (path === '/api/auth/session') return Response.json({ user: { id: '42', email: 'dev@example.com', name: 'Ali' } })
    if (path === '/api/developer/profile') return Response.json({ profile: { id: '42', name: 'Ali' } })
    throw new Error('network disconnected')
  })
  f.mount(); await flush(); const value = f.render()
  assert.equal(value.user.id, '42')
  assert.equal(value.authReady, true)
  assert.equal(value.sessionError, '')
  assert.ok(value.developerAppsError)
  assert.equal(value.developerAppsLoading, false)
  assert.equal(f.redirects.length, 0)
})
test('session transport failure has its own error, without declaring the account logged out', async () => {
  const f = store(async () => { throw new Error('offline') })
  f.mount(); await flush()
  const value = f.render()
  assert.ok(value.sessionError)
  assert.equal(value.authReady, true)
  assert.equal(f.redirects.length, 0)
})
test('older app responses cannot overwrite newer reloads', async () => {
  let resolveFirst, calls = 0
  const f = store(async path => {
    if (path.startsWith('/api/developer-hub/apps?')) {
      if (++calls === 1) return new Promise(resolve => { resolveFirst = resolve })
      return Response.json({ results: [{ id: 2 }], next: null })
    }
    return Response.json({ id: path.includes('/2') ? 2 : 1, name: 'App', canEdit: true })
  })
  const value = f.render()
  const old = value.reloadDeveloperApps()
  await value.reloadDeveloperApps()
  resolveFirst(Response.json({ results: [{ id: 1 }], next: null })); await old
  assert.equal(f.render().myApps[0].id, '2')
})
test('logout invalidates an in-flight developer app load', async () => {
  let release
  const f = store(async path => path.includes('/apps?') ? new Promise(resolve => { release = resolve }) : Response.json({ id: 1, name: 'App' }))
  const value = f.render(), pending = value.reloadDeveloperApps()
  await value.logout()
  release(Response.json({ results: [{ id: 1 }], next: null })); await pending
  assert.equal(f.render().myApps.length, 0)
})
function screenshotPicker(files = [], failRead = false) {
  const file = 'app/upload/page.tsx', source = fs.readFileSync(file, 'utf8')
  const start = source.indexOf('  async function selectScreenshots('), end = source.indexOf('\n  function removeScreenshot', start)
  let screenshots = files, previews = files.map(file => `preview:${file.name}`), error = '', release
  class FileReader { readAsDataURL(file) { this.result = `preview:${file.name}`; if (failRead) this.onerror(); else this.onload() } }
  const state = { mediaReading: { current: false }, submitting: { current: false }, setMediaBusy() {}, MAX_SCREENSHOTS: 10, screenshotFiles: files,
    setErrorMessage: value => error = value, FileReader,
    validateImage: () => new Promise(resolve => { release = resolve }),
    setScreenshotFiles: update => screenshots = update(screenshots), setScreenshotPreviews: update => previews = update(previews),
  }
  vm.runInNewContext(compile(source.slice(start, end) + '\nglobalThis.pick=selectScreenshots'), state)
  return { pick: state.pick, release: () => release(true), files: () => screenshots, previews: () => previews, error: () => error }
}
test('overlapping screenshot selections cannot duplicate or desynchronize file/preview arrays', async () => {
  const file = { name: 'one.png', size: 12, lastModified: 1 }
  const f = screenshotPicker()
  const first = f.pick([file]); await f.pick([file]); f.release(); await first
  assert.equal(f.files().length, 1)
  assert.equal(f.previews().length, 1)
})
test('screenshot overflow reports a limit without silently discarding some chosen files', async () => {
  const existing = Array.from({ length: 9 }, (_, n) => ({ name: `${n}.png`, size: 12, lastModified: n }))
  const f = screenshotPicker(existing)
  await f.pick([{ name: 'new.png', size: 12, lastModified: 100 }, { name: 'second.png', size: 12, lastModified: 101 }])
  assert.equal(f.files().length, 9)
  assert.ok(f.error())
})
test('FileReader failure is handled without clearing the existing screenshot set', async () => {
  const f = screenshotPicker([], true)
  const pending = f.pick([{ name: 'one.png', size: 1, lastModified: 1 }]); f.release(); await pending
  assert.equal(f.files().length, 0)
  assert.ok(f.error().includes('خواندن تصاویر'))
})

test('Persian and Arabic numeric inputs retain their value in backend ASCII format', () => {
  const normalize = load('lib/input-normalization.ts').asciiDigits
  assert.equal(normalize('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789')
  assert.equal(normalize('٠١٢٣٤٥٦٧٨٩'), '0123456789')
  assert.equal(normalize('+98 ۹۱۲'), '+98 912')
})

function all(node, match) {
  if (!node || typeof node !== 'object') return []
  return [...(match(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, match))]
}
function nodeText(node) { return node == null || typeof node === 'boolean' ? '' : typeof node === 'object' ? [node.props?.children].flat(Infinity).map(nodeText).join('') : String(node) }
test('admin console retains refreshed ticket state across tab changes', () => {
  const h = hooks(), symbols = new Proxy({}, { get: (_, name) => name })
  const Console = load('components/admin/admin-console.tsx', {
    react: h.api, 'lucide-react': symbols,
    ...Object.fromEntries(['admin-payment-deadlines', 'admin-submissions', 'admin-tickets'].map(name => [`@/components/admin/${name}`, symbols])),
    '@/components/ui/button': symbols,
  }).AdminConsole
  const props = { submissions: [], submissionsError: '', stats: [], tickets: [{ id: 42, status: 'unanswered' }], ticketsError: '', canReviewSubmission: true }
  const render = () => { h.begin(); return Console(props) }
  all(render(), node => node.type === 'Button' && nodeText(node).includes('تیکت‌ها'))[0].props.onClick()
  const tickets = all(render(), node => node.type === 'AdminTickets')[0]
  tickets.props.onTicketsChange([{ id: 42, status: 'answered' }])
  all(render(), node => node.type === 'Button' && nodeText(node).includes('بررسی و انتشار'))[0].props.onClick()
  all(render(), node => node.type === 'Button' && nodeText(node).includes('تیکت‌ها'))[0].props.onClick()
  assert.equal(all(render(), node => node.type === 'AdminTickets')[0].props.tickets[0].status, 'answered')
})
test('admin detail loading and errors remain scoped to the selected submission', async () => {
  const h = hooks(), symbols = new Proxy({}, { get: (_, name) => name })
  const requests = []
  const Component = load('components/admin/admin-submissions.tsx', {
    react: h.api, 'lucide-react': symbols,
    '@/components/listing-changes': { ListingChanges: 'ListingChanges' },
    '@/lib/listing-revisions': load('lib/listing-revisions.ts'),
    '@/lib/payment-deadline': { paymentDate: () => 'date' },
    '@/lib/developer-hub-client': { developerHubFieldErrors: () => ({}) },
    '@/lib/admin-hub-model': { adminSubmissionKindLabel: () => 'new', adminSubmissionStatusLabel: () => 'pending' },
    ...Object.fromEntries(['badge','button','input','textarea'].map(name => [`@/components/ui/${name}`, symbols])),
  }, { fetch: () => new Promise(resolve => requests.push(resolve)) }).AdminSubmissions
  const submissions = [1, 2].map(id => ({ id, kind: 'new', status: 'pending_review', app: { name: `App ${id}`, packageName: `com.app${id}` }, developer: { name: 'Ali' }, submittedAt: '2026-10-15T12:00:00Z' }))
  const render = () => { h.begin(); return Component({ submissions, canReviewSubmission: true }) }
  const first = all(render(), node => node.type === 'Button' && nodeText(node).includes('بررسی جزئیات'))[0].props.onClick()
  const second = all(render(), node => node.type === 'Button' && nodeText(node).includes('بررسی جزئیات'))[0].props.onClick()
  requests[0](Response.json({ detail: 'first request failed' }, { status: 500 })); await first; await flush()
  const tree = render()
  assert.ok(nodeText(tree).includes('در حال دریافت جزئیات'))
  assert.ok(!nodeText(tree).includes('first request failed'))
  requests[1](Response.json({ detail: 'second request failed' }, { status: 500 })); await second; await flush()
  assert.ok(nodeText(render()).includes('second request failed'))
})

test('app list and detail transport timeouts become explicit JSON 502 responses', async () => {
  for (const file of ['app/api/developer-hub/apps/route.ts', 'app/api/developer-hub/apps/[id]/route.ts']) {
    const route = load(file, { 'next/server': { NextResponse: Response }, '@/lib/developer-api': { developerHubApi: async () => { throw new Error('UND_ERR_CONNECT_TIMEOUT') } } }).GET
    const response = await route(new Request('https://local/api'), { params: Promise.resolve({ id: '42' }) })
    assert.equal(response.status, 502)
    assert.ok((await response.json()).detail.includes('ارتباط'))
  }
})

test('app list retries one transient read and recovers without changing authentication', async () => {
  let calls = 0
  const route = load('app/api/developer-hub/apps/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/developer-api': {
    developerHubApi: async () => { if (++calls === 1) throw Object.assign(new Error('timeout'), { code: 'UND_ERR_CONNECT_TIMEOUT' }); return Response.json({ results: [], next: null }) },
    copyBackendResponse: (response, payload) => Response.json(payload, { status: response.status }),
  } }, { console: { error() {} } }).GET
  const response = await route(new Request('https://local/api'))
  assert.equal(calls, 2)
  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).results, [])
})
test('app list does not retry auth or application errors and exposes a safe tracking reference', async () => {
  for (const status of [400, 401, 403, 429, 500]) {
    let calls = 0
    const logs = []
    const route = load('app/api/developer-hub/apps/route.ts', { 'next/server': { NextResponse: Response }, '@/lib/developer-api': {
      developerHubApi: async () => { calls++; return Response.json({ detail: 'backend failed' }, { status }) },
      copyBackendResponse: (response, payload) => Response.json(payload, { status: response.status }),
    } }, { console: { error: (...args) => logs.push(args) } }).GET
    const response = await route(new Request('https://local/api'))
    const payload = await response.json()
    assert.equal(calls, 1)
    assert.equal(response.status, status)
    assert.equal(payload.detail, 'backend failed')
    assert.ok(payload.supportReference)
    assert.equal(logs[0][1].supportReference, payload.supportReference)
  }
})
test('dashboard exposes the backend error and tracking reference without losing the logged-in user', async () => {
  const f = store(async path => {
    if (path === '/api/auth/session') return Response.json({ user: { id: '42', email: 'dev@example.com', name: 'Ali' } })
    if (path === '/api/developer/profile') return Response.json({ profile: { id: '42', name: 'Ali' } })
    return Response.json({ detail: 'سرویس در دسترس نیست', supportReference: 'safe-reference' }, { status: 502 })
  })
  f.mount(); await flush()
  assert.equal(f.render().user.id, '42')
  assert.ok(f.render().developerAppsError.includes('سرویس در دسترس نیست'))
  assert.ok(f.render().developerAppsError.includes('safe-reference'))
})

test('transient token-service failure is not reported as an expired upload session', async () => {
  let uploads = 0, redirects = 0
  const client = load('lib/developer-hub-client.ts', {}, {
    fetch: async () => Response.json({ detail: 'سرویس موقتاً قطع است' }, { status: 502 }),
    XMLHttpRequest: class { constructor() { uploads++ } },
    window: { location: { assign() { redirects++ } } },
  })
  let failure
  try { await client.postDeveloperHubMultipart('/api/v1/developer-hub/apps/', new FormData()) } catch (error) { failure = error }
  assert.equal(failure.status, 502)
  assert.equal(client.developerHubErrorMessage(failure, 'fallback'), 'سرویس موقتاً قطع است')
  assert.equal(redirects, 0)
  assert.equal(uploads, 0)
})
test('a successful HTTP upload without a valid JSON result is explicitly unconfirmed', async () => {
  class XHR {
    upload = {}; status = 200; responseText = '<html>proxy failure</html>'
    open() {}; setRequestHeader() {}; send() { this.onload() }
  }
  const client = load('lib/developer-hub-client.ts', {}, { XMLHttpRequest: XHR, fetch: async () => Response.json({ access: 'token', baseUrl: '/backend-api' }) })
  await assert.rejects(client.postDeveloperHubMultipart('/api/v1/developer-hub/apps/', new FormData()), /upload_result_unknown/)
})
test('access-token endpoint reports refresh transport errors as private JSON 502', async () => {
  const route = load('app/api/auth/access-token/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/developer-api': { getDeveloperAccessToken: async () => { throw new Error('timeout') } },
  }).GET
  const response = await route()
  assert.equal(response.status, 502)
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store')
  assert.ok((await response.json()).detail)
})
test('refresh endpoint rejects malformed success responses without setting access cookies', async () => {
  for (const payload of [{}, { access: '' }, { access: 123 }]) {
    let cookiesSet = 0
    const route = load('app/api/auth/refresh/route.ts', {
      'next/headers': { cookies: async () => ({ get: () => ({ value: 'refresh' }) }) },
      'next/server': { NextResponse: { json: (body, init) => ({ status: init?.status || 200, body, cookies: { set() { cookiesSet++ } } }) } },
      '@/lib/developer-api': { developerApi: async () => Response.json(payload), authCookieOptions: () => ({}) },
    }).POST
    assert.equal((await route()).status, 502)
    assert.equal(cookiesSet, 0)
  }
})
test('late profile and terms saves cannot restore a logged-out account', async () => {
  for (const method of ['updateProfile', 'acceptTerms']) {
    let release
    const f = store(async path => path === '/api/developer/profile' ? new Promise(resolve => { release = resolve }) : Response.json({ ok: true }))
    f.render().login({ id: 'alice', name: 'Alice' })
    const value = f.render(), pending = value[method]({ name: 'Updated' })
    await value.logout()
    release(Response.json({ profile: { id: 'alice', name: 'Updated' } }))
    await assert.rejects(pending, /نشست حساب تغییر/)
    assert.equal(f.render().user, null)
  }
})
test('late ticket creation cannot insert a previous account ticket after switching accounts', async () => {
  let release
  const f = store(async () => new Promise(resolve => { release = resolve }))
  f.render().login({ id: 'alice', name: 'Alice' })
  const pending = f.render().addTicket({ subject: 'S', question: 'Q' })
  f.render().login({ id: 'bob', name: 'Bob' })
  release(Response.json({ id: 42, subject: 'Alice ticket' }))
  await assert.rejects(pending, /نشست حساب تغییر/)
  assert.equal(f.render().user.id, 'bob')
  assert.equal(f.render().tickets.length, 0)
})
test('late unauthorized app and ticket reads cannot redirect a newer account session', async () => {
  for (const method of ['reloadDeveloperApps', 'reloadTickets']) {
    let release
    const f = store(async () => new Promise(resolve => { release = resolve }))
    const pending = f.render()[method]()
    f.render().login({ id: 'bob', name: 'Bob' })
    release(Response.json({ detail: 'old token expired' }, { status: 401 }))
    await pending
    assert.equal(f.redirects.length, 0)
    assert.equal(f.render().user.id, 'bob')
  }
})
test('initial session response cannot replace a subsequently logged-in account', async () => {
  let release
  const f = store(async () => new Promise(resolve => { release = resolve }))
  f.mount()
  f.render().login({ id: 'bob', name: 'Bob' })
  release(Response.json({ user: { id: 'alice', name: 'Alice' } }))
  await flush()
  assert.equal(f.render().user.id, 'bob')
})
test('submission read and decision transport failures return JSON without retrying mutations', async () => {
  const files = [
    ['app/api/developer-hub/submissions/[id]/route.ts','GET'],
    ['app/api/admin-hub/submissions/[id]/route.ts','GET'],
    ['app/api/developer-hub/submissions/[id]/cancel/route.ts','POST'],
    ['app/api/admin-hub/submissions/[id]/approve/route.ts','POST'],
    ['app/api/admin-hub/submissions/[id]/reject/route.ts','POST'],
  ]
  for (const [file, method] of files) {
    let calls = 0
    const api = async () => { calls++; throw new Error('timeout') }
    const route = load(file, { 'next/server': { NextResponse: Response }, '@/lib/developer-api': { developerHubApi: api }, '@/lib/admin-auth': { adminHubApi: api } })[method]
    const response = await route(new Request('https://local/api', { method, ...(method === 'POST' ? { body: '{}' } : {}) }), { params: Promise.resolve({ id: '42' }) })
    assert.equal(response.status, 502)
    assert.equal(calls, 1)
    const payload = await response.json()
    assert.ok(payload.detail)
    if (method === 'POST') assert.ok(payload.detail.includes('قبل از تکرار'))
  }
})
test('admin identity service outage is retryable instead of being classified as non-staff', async () => {
  const lib = load('lib/admin-auth.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'staff-token' }) }) },
    '@/lib/developer-api': { developerApi: async () => Response.json({ detail: 'maintenance' }, { status: 503 }) },
  })
  await assert.rejects(lib.getAdminUser(), /admin_identity_unavailable/)
})
