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
    const response = await route.GET(new Request('https://local/api?status=answered'))
    assert.deepEqual((await response.json()).tickets.map(ticket => ticket.id), [1, 2])
    assert.ok(paths.every(path => path.startsWith(`/api/v1/developer-hub/${kind === 'admin' ? 'admin/' : ''}tickets/`)))
    assert.ok(paths[1].includes('page=2'))
    if (kind === 'admin') assert.ok(paths.every(path => path.includes('status=answered')))
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
  assert.equal((await route.GET(new Request('https://local/api?status=closed'))).status, 400)
})
test('detail uses developer-scoped endpoint and forwards ownership not-found', async () => {
  let path
  const response = await routes(async value => { path = value; return Response.json({ detail: 'not found' }, { status: 404 }) }).detail.GET({}, params)
  assert.equal(path, '/api/v1/developer-hub/tickets/42/')
  assert.equal(response.status, 404)
})
test('staff reply accepts 20,000 chars, sends only answer, and preserves single-answer conflict', async () => {
  let sent
  const route = routes(async (path, init) => { sent = { path, ...JSON.parse(init.body) }; return Response.json({ code: 'ticket_already_answered' }, { status: 409 }) }).reply
  const response = await route.POST(body({ answer: 'x'.repeat(20000), developer: 'other', action: 'close' }), params)
  assert.equal(response.status, 409)
  assert.equal((await response.json()).code, 'ticket_already_answered')
  assert.equal(sent.path, '/api/v1/developer-hub/admin/tickets/42/reply/')
  assert.deepEqual(Object.keys(sent), ['path', 'answer'])
  assert.equal((await route.POST(body({ answer: 'x'.repeat(20001) }), params)).status, 400)
  assert.equal((await route.POST(body({ answer: '  ' }), params)).status, 400)
})
test('follow-up is a new-ticket draft referencing original id and respecting subject length', () => {
  const draft = helpers.followUpTicket({ id: 42, subject: 'x'.repeat(200) })
  assert.equal(draft.subject.length, 200)
  assert.ok(draft.subject.includes('#42'))
  assert.ok(draft.question.includes('#42'))
  assert.equal(draft.status, undefined)
})
// Exercise real component event handlers with a tiny hook runtime; no browser or real account mutations.
function replyComponent(response, refresh = async () => {}) {
  let states = [], index = 0, posted = 0, updated
  const refs = []
  const react = {
    useState(value) { const id = index++; if (!(id in states)) states[id] = value; return [states[id], next => { states[id] = typeof next === 'function' ? next(states[id]) : next }] },
    useRef(value) { const id = index++; if (!refs[id]) refs[id] = { current: value }; return refs[id] },
  }
  const ui = new Proxy({}, { get: (_, key) => key })
  const component = load('components/admin/admin-tickets.tsx', {
    react, 'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    '@/lib/support-tickets': helpers, '@/components/ticket-conversation': ui,
    ...Object.fromEntries(['badge', 'button', 'input', 'textarea'].map(name => [`@/components/ui/${name}`, ui])),
  }, { fetch: async () => { posted++; return response.clone() }, window: { location: { assign() {} } } }).TicketReply
  const render = () => { index = 0; return component({ ticket: { id: 42, status: 'unanswered' }, onRefresh: refresh, onAnswered: ticket => updated = ticket }) }
  const tree = render()
  tree.props.children.find(child => child?.type === 'Textarea').props.onChange({ target: { value: 'my answer' } })
  return { render, states, posted: () => posted, updated: () => updated }
}
test('reply UI keeps draft and never overwrites on conflict; refreshes authoritative inbox', async () => {
  let refreshed = 0
  const ui = replyComponent(Response.json({ code: 'ticket_already_answered' }, { status: 409 }), async () => { refreshed++ })
  await ui.render().props.onSubmit({ preventDefault() {} })
  assert.equal(refreshed, 1)
  assert.equal(ui.updated(), undefined)
  assert.equal(ui.states[0], 'my answer')
  assert.ok(ui.states[2])
})
test('reply UI retains failed draft and blocks duplicate in-flight submits', async () => {
  const ui = replyComponent(Response.json({ detail: 'try later' }, { status: 429 }))
  const form = ui.render()
  await Promise.all([form.props.onSubmit({ preventDefault() {} }), form.props.onSubmit({ preventDefault() {} })])
  assert.equal(ui.posted(), 1)
  assert.equal(ui.states[0], 'my answer')
  assert.equal(ui.states[2], 'try later')
  assert.equal(ui.updated(), undefined)
})
test('reply UI marks success answered, then reloads backend inbox', async () => {
  let refreshed = 0
  const ui = replyComponent(Response.json({ answer: 'saved answer', answeredAt: '2026-10-15T10:00:00Z' }), async () => { refreshed++ })
  await ui.render().props.onSubmit({ preventDefault() {} })
  assert.equal(ui.updated().status, 'answered')
  assert.equal(ui.updated().answer, 'saved answer')
  assert.equal(refreshed, 1)
})
