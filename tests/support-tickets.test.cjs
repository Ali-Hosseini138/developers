const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(path, mocks = {}, globals = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: key => key in mocks ? mocks[key] : require(key), Response, Request, URL, ...globals })
  return mod.exports
}
const helpers = load('lib/support-tickets.ts')
const next = { NextResponse: Response }
const copyBackendResponse = (response, payload) => Response.json(payload, { status: response.status, headers: response.headers })
function routes(api) {
  const mocks = { 'next/server': next, '@/lib/support-tickets': helpers,
    '@/lib/developer-api': { developerHubApi: api, copyBackendResponse }, '@/lib/admin-auth': { adminHubApi: api } }
  return {
    developer: load('app/api/developer/tickets/route.ts', mocks),
    detail: load('app/api/developer/tickets/[id]/route.ts', mocks),
    admin: load('app/api/admin-hub/tickets/route.ts', mocks),
    reply: load('app/api/admin-hub/tickets/[id]/reply/route.ts', mocks),
  }
}
const body = value => ({ json: async () => value })
const params = { params: Promise.resolve({ id: '42' }) }
test('developer create forwards exact camelCase contract, never supplied ownership or status', async () => {
  let sent
  const route = routes(async (path, init) => { sent = { path, ...JSON.parse(init.body) }; return Response.json({ id: 42, status: 'unanswered' }, { status: 201 }) }).developer
  const response = await route.POST(body({ subject: ' S ', question: ' Q ', developer: 'other', status: 'answered', answer: 'fake' }))
  assert.equal(response.status, 201)
  assert.deepEqual(sent, { path: '/api/v1/developer-hub/tickets/', subject: 'S', question: 'Q' })
})
test('ticket create accepts one-character fields, rejects absent, oversized and legacy fields', async () => {
  let calls = 0
  const route = routes(async () => { calls++; return Response.json({ id: 1 }) }).developer
  for (const value of [null, {}, { subject: 'x', message: 'legacy' }, { subject: 'x'.repeat(201), question: 'y' }, { subject: 'x', question: 'y'.repeat(10001) }]) {
    assert.equal((await route.POST(body(value))).status, 400)
  }
  assert.equal((await route.POST(body({ subject: 'x', question: 'y' }))).status, 200)
  assert.equal(calls, 1)
})
test('both inboxes exhaust pagination, retain backend order and ignore external next URLs', async () => {
  for (const kind of ['developer', 'admin']) {
    const paths = []
    const route = routes(async path => {
      paths.push(path)
      return Response.json({ results: [{ id: paths.length }], next: paths.length === 1 ? 'https://untrusted.example/steal' : null })
    })[kind]
    const response = await route.GET(new Request('https://local/api?status=closed'))
    assert.deepEqual((await response.json()).tickets.map(ticket => ticket.id), [1, 2])
    assert.ok(paths.every(path => path.startsWith(`/api/v1/developer-hub/${kind === 'admin' ? 'admin/' : ''}tickets/`)))
    assert.ok(paths[1].includes('page=2'))
    if (kind === 'admin') assert.ok(paths.every(path => path.includes('status=closed')))
  }
})
test('inbox failure discards partial pages and preserves auth/error/Retry-After status', async () => {
  for (const status of [401, 403, 429, 500]) {
    let calls = 0
    const route = routes(async () => ++calls === 1 ? Response.json({ results: [{ id: 1 }], next: 'next' }) : Response.json({ detail: 'denied' }, { status, headers: { 'Retry-After': '30' } })).developer
    const response = await route.GET()
    assert.equal(response.status, status)
    assert.equal(response.headers.get('Retry-After'), '30')
    assert.deepEqual(await response.json(), { detail: 'denied' })
  }
})
test('invalid inbox filter never reaches staff backend', async () => {
  const route = routes(async () => { throw new Error('must not call') }).admin
  assert.equal((await route.GET(new Request('https://local/api?status=unanswered'))).status, 400)
})
test('detail uses developer-scoped endpoint and forwards ownership not-found', async () => {
  let path
  const response = await routes(async value => { path = value; return Response.json({ detail: 'not found' }, { status: 404 }) }).detail.GET({}, params)
  assert.equal(path, '/api/v1/developer-hub/tickets/42/')
  assert.equal(response.status, 404)
})
test('staff reply uses body and allows repeated replies without changing subject or ownership', async () => {
  const sent = []
  const route = routes(async (path, init) => { sent.push({ path, ...JSON.parse(init.body) }); return Response.json({ id: 42, status: 'open' }) }).reply
  for (let i = 0; i < 2; i++) assert.equal((await route.POST(body({ body: ' Reply ', answer: 'legacy', developer: 'other' }), params)).status, 200)
  assert.deepEqual(sent[0], { path: '/api/v1/developer-hub/admin/tickets/42/reply/', body: 'Reply' })
  assert.equal((await route.POST(body({ answer: 'legacy' }), params)).status, 400)
  assert.equal((await route.POST(body({ body: '  ' }), params)).status, 400)
})

function actionRoutes(api, staff = false) {
  return load(`app/api/${staff ? 'admin-hub' : 'developer'}/tickets/[id]/[action]/route.ts`, {
    'next/server': next, '@/lib/developer-api': { developerHubApi: api, copyBackendResponse }, '@/lib/admin-auth': { adminHubApi: api },
  })
}
test('developer follow-up stays on the same ticket and sends only the trimmed message body', async () => {
  let sent
  const route = actionRoutes(async (path, init) => { sent = { path, ...JSON.parse(init.body) }; return Response.json({ id: 42 }) })
  assert.equal((await route.POST(body({ body: ' follow up ', senderType: 'staff', developer: 999 }), { params: Promise.resolve({ id: '42', action: 'messages' }) })).status, 200)
  assert.deepEqual(sent, { path: '/api/v1/developer-hub/tickets/42/messages/', body: 'follow up' })
})
test('both roles close/reopen only scoped tickets; unknown actions never reach backend', async () => {
  for (const staff of [false, true]) {
    const sent = []
    const route = actionRoutes(async (path, init) => { sent.push({ path, method: init.method }); return new Response(null, { status: 204 }) }, staff)
    for (const action of ['close', 'reopen']) assert.equal((await route.POST({}, { params: Promise.resolve({ id: '42', action }) })).status, 204)
    assert.deepEqual(sent.map(item => item.path), ['close', 'reopen'].map(action => `/api/v1/developer-hub/${staff ? 'admin/' : ''}tickets/42/${action}/`))
    assert.equal((await route.POST({}, { params: Promise.resolve({ id: '42', action: 'delete' }) })).status, 400)
    assert.equal(sent.length, 2)
  }
})
test('ticket lists support a plain array response as well as paginated responses', async () => {
  assert.deepEqual(await (await helpers.loadTicketPages(async () => Response.json([{ id: 42 }]), '/tickets/')).json(), { tickets: [{ id: 42 }] })
})

// Exercise component handlers with hook state, including duplicate clicks and failed requests.
function actionComponent(response, refresh = async () => {}) {
  const states = [], refs = []
  let index = 0, posted = 0, sent
  const react = {
    useState(value) { const id = index++; if (!(id in states)) states[id] = value; return [states[id], next => { states[id] = typeof next === 'function' ? next(states[id]) : next }] },
    useRef(value) { const id = index++; if (!refs[id]) refs[id] = { current: value }; return refs[id] },
  }
  const ui = new Proxy({}, { get: (_, key) => key })
  const component = load('components/ticket-actions.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/lib/support-tickets': helpers,
    ...Object.fromEntries(['button', 'textarea'].map(name => [`@/components/ui/${name}`, ui])),
  }, { fetch: async (path, init) => { posted++; sent = { path, ...JSON.parse(init.body) }; return response.clone() }, window: { location: { assign() {} } } }).TicketActions
  const render = () => { index = 0; return component({ ticket: { id: 42, status: 'closed' }, staff: true, onRefresh: refresh }) }
  const form = render().props.children[0]
  form.props.children.find(child => child?.type === 'Textarea').props.onChange({ target: { value: 'my answer' } })
  return { render, states, posted: () => posted, sent: () => sent }
}
test('failed message keeps the draft and blocks duplicate in-flight submits', async () => {
  const ui = actionComponent(Response.json({ detail: 'try later' }, { status: 429 }))
  const form = ui.render().props.children[0]
  form.props.onSubmit({ preventDefault() {} }); form.props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(ui.posted(), 1)
  assert.equal(ui.states[0], 'my answer')
  assert.equal(ui.states[2], 'try later')
})
test('successful staff reply clears its draft, reloads messages and allows a second reply', async () => {
  let refreshed = 0
  const ui = actionComponent(Response.json({ id: 99 }), async () => { refreshed++ })
  ui.render().props.children[0].props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(ui.states[0], '')
  assert.equal(refreshed, 1)
  assert.deepEqual(ui.sent(), { path: '/api/admin-hub/tickets/42/reply', body: 'my answer' })
  ui.render().props.children[0].props.children.find(child => child?.type === 'Textarea').props.onChange({ target: { value: 'second' } })
  ui.render().props.children[0].props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(refreshed, 2)
})
