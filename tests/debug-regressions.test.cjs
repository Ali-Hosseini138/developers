const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { ticketError } = (() => { const mod = { exports: {} }; vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/support-tickets.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: mod, exports: mod.exports }); return mod.exports })()
function handler(file, name, state) {
  const source = fs.readFileSync(file, 'utf8')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  let match
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === name) match = node; ts.forEachChild(node, visit) }
  visit(ast)
  assert.ok(match, name)
  const code = ts.transpileModule(match.getText(ast) + '\nglobalThis.invoke=' + name, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, state)
  return state.invoke
}
const noop = () => {}
const event = { preventDefault() {} }
function defaults() {
  return { loading: false, success: false, authRequestInFlight: { current: false }, resetInFlight: { current: false }, ticketRequestInFlight: { current: false }, decisionInFlight: { current: false }, setLoading: noop, resetMessages: noop, setErrorMessage: noop, setSuccess: noop, setPassword: noop, setConfirm: noop, setSignupStep: noop, setTicketSending: noop, setTicketError: noop, setSubject: noop, setMessage: noop, setBusy: noop, setFieldErrors: noop, setActionError: noop, ticketError, Response, FormData, router: { push: noop, replace: noop, refresh: noop }, window: { setTimeout: noop, location: { assign: noop, reload: noop } } }
}
test('signup cannot send two registration requests before React re-renders', async () => {
  let release, calls = 0
  const wait = new Promise(resolve => release = resolve)
  const state = { ...defaults(), accountType: 'individual', stepValid: true, normalizedEmail: 'dev@example.com', normalizedPhone: '', password: 'long-password', name: 'Ali', lastName: 'H', nationalId: '1234567890', organization: '', ceoNationalCard: null, extractError: () => '', fetch: async () => { calls++; await wait; return Response.json({ detail: 'registered' }, { status: 201 }) } }
  const invoke = handler('components/auth-form.tsx', 'finishSignup', state)
  const a = invoke(), b = invoke(); release(); await Promise.all([a, b]); assert.equal(calls, 1)
})
test('new support ticket cannot be duplicated by simultaneous form submissions', async () => {
  let release, calls = 0
  const wait = new Promise(resolve => release = resolve)
  const state = { ...defaults(), subject: 'Subject', message: 'Question', ticketSending: false, addTicket: async () => { calls++; await wait } }
  const invoke = handler('app/dashboard/page.tsx', 'submitTicket', state)
  const a = invoke(event), b = invoke(event); release(); await Promise.all([a, b]); assert.equal(calls, 1)
})
test('password reset prevents duplicate submissions and preserves backend password validation', async () => {
  let release, calls = 0, error = ''
  const wait = new Promise(resolve => release = resolve)
  const state = { ...defaults(), token: 'reset-token', password: 'long-password', confirm: 'long-password', setErrorMessage: v => error = v, fetch: async () => { calls++; await wait; return Response.json({ newPassword: ['رمز عبور بیش از حد رایج است.'] }, { status: 400 }) } }
  const invoke = handler('app/reset-password/page.tsx', 'submit', state)
  const a = invoke(event), b = invoke(event); release(); await Promise.all([a, b]); assert.equal(calls, 1); assert.equal(error, 'رمز عبور بیش از حد رایج است.')
})
test('admin approve and reject actions cannot overlap before the busy state renders', async () => {
  let release, calls = 0
  const wait = new Promise(resolve => release = resolve)
  const state = { ...defaults(), busy: null, detail: { id: 42, canDecide: true, kind: 'update' }, canReviewSubmission: true, canApprove: true, listingOnly: true, reason: 'Rejected', developerHubFieldErrors: () => ({}), errorMessage: () => 'failed', fetch: async () => { calls++; await wait; return Response.json({ id: 42 }) } }
  const invoke = handler('components/admin/admin-submissions.tsx', 'decide', state)
  const a = invoke('approve'), b = invoke('reject'); release(); await Promise.all([a, b]); assert.equal(calls, 1)
})

test('malformed registration is a client error, while upstream outages remain 502', async () => {
  const mod = { exports: {} }; let calls = 0
  const code = ts.transpileModule(fs.readFileSync('app/api/auth/register/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Response, FormData, require: () => ({ developerApi: async () => { calls++; throw new Error('offline') }, copyBackendResponse: () => {} }) })
  for (const body of ['{broken', 'null', '[]', '"text"']) {
    const r = await mod.exports.POST(new Request('https://local/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body }))
    assert.equal(r.status, 400)
  }
  assert.equal(calls, 0)
  const r = await mod.exports.POST(new Request('https://local/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"accountType":"legal"}' }))
  assert.equal(r.status, 502)
  assert.equal(calls, 1)
})

test('profile saving and password recovery each allow only one pending mutation', async () => {
  for (const kind of ['profile', 'recovery']) {
    let release, calls = 0
    const wait = new Promise(resolve => release = resolve)
    const state = { ...defaults(), saving: false, profileInFlight: { current: false }, recoveryInFlight: { current: false }, setSaving() {}, setSaved() {}, setSent() {}, firstName: 'Ali', lastName: 'H', phone: '09120000000', nationalId: '1234567890', organization: '', accountType: 'individual', email: 'dev@example.com', asciiDigits: v => v, updateProfile: async () => { calls++; await wait }, fetch: async () => { calls++; await wait; return Response.json({ detail: 'sent' }) } }
    const invoke = handler(kind === 'profile' ? 'app/account/page.tsx' : 'app/forgot-password/page.tsx', kind === 'profile' ? 'save' : 'submit', state)
    const a = invoke(event), b = invoke(event); release(); await Promise.all([a, b]); assert.equal(calls, 1, kind)
  }
})
