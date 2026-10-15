const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function load(path, mocks = {}) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: key => key in mocks ? mocks[key] : require(key), TextEncoder, Uint8Array, DataView, Blob, FormData, Response })
  return mod.exports
}
const description = load('lib/app-description.ts')
test('air-mouse notice is added once, removed when TV support changes, and preserves content', () => {
  const value = description.appDescription('توضیحات من', true)
  assert.equal(value, `${description.AIR_MOUSE_NOTICE}\nتوضیحات من`)
  assert.equal(description.appDescription(value, true), value)
  assert.equal(description.appDescription(value, false), 'توضیحات من')
  assert.equal(description.shortAppDescription('  متن\n  کوتاه '), 'متن کوتاه')
  assert.equal(description.shortAppDescription('x'.repeat(1200)).length, 1000)
})
async function create(overrides = {}) {
  const source = fs.readFileSync('app/upload/page.tsx', 'utf8')
  const start = source.indexOf('  async function submitForReview(')
  const code = ts.transpileModule(source.slice(start, source.indexOf('\n  return (', start)) + '\nsubmitForReview()', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  let sent, error = ''
  const file = new Blob(['png'], { type: 'image/png' })
  const state = { ...description, saving: false, requirementsValid: true, name: 'App', nameEn: '', description: 'Full description', descriptionEn: '',
    apkFile: file, iconFile: file, bannerFile: file, backgroundFile: file, screenshotFiles: [], packageName: 'com.real.app', categoryId: '12', applicationType: '1', ageLimit: '0',
    supportsNetboxPayment: true, hasInAppPayment: true, paymentCommitmentAccepted: true, developedForAndroidTv: false, airMouseCompatible: true, changeLog: '',
    setFieldErrors() {}, setErrorMessage: value => error = value, setSaving() {}, setSubmitProgress() {}, setSubmitStage() {}, setStep() {},
    FormData, window: { setTimeout: fn => fn() }, router: { push() {}, refresh() {} }, reloadDeveloperApps: async () => {},
    postDeveloperHubMultipart: async (path, form) => { sent = { path, entries: Object.fromEntries(form.entries()) } },
    developerHubErrorMessage: () => 'rejected', developerHubFieldErrors: () => ({}), ...overrides }
  await vm.runInNewContext(code, state)
  return { sent, error }
}
test('new submission needs no short-description input, and adds the air-mouse notice to long description', async () => {
  const r = await create()
  assert.equal(r.sent.path, '/api/v1/developer-hub/apps/')
  assert.equal(r.sent.entries.shortDescription, 'Full description')
  assert.equal(r.sent.entries.shortDescriptionEn, undefined)
  assert.equal(r.sent.entries.longDescription, `${description.AIR_MOUSE_NOTICE}\nFull description`)
  assert.equal(r.sent.entries.supportsNetboxPayment, 'true')
  assert.equal(r.sent.entries.paymentCommitmentAccepted, 'true')
  assert.equal(r.sent.entries.changeLog, undefined)
})
test('no-payment submission sends false capability and commitment flags', async () => {
  const r = await create({ hasInAppPayment: false, supportsNetboxPayment: false, paymentCommitmentAccepted: false, developedForAndroidTv: true, airMouseCompatible: false })
  assert.equal(r.sent.entries.hasInAppPayment, 'false')
  assert.equal(r.sent.entries.paymentCommitmentAccepted, 'false')
  assert.equal(r.sent.entries.longDescription, 'Full description')
})
test('a description exceeding the contract after the added notice is rejected before upload', async () => {
  const r = await create({ description: 'x'.repeat(20000) })
  assert.equal(r.sent, undefined)
  assert.ok(r.error)
})
const ticketId = '00000000-0000-4000-8000-000000000001'
function replyRoute(identity, rpc) {
  return load('app/api/developer/tickets/[id]/reply/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/developer-identity': { getDeveloperIdentity: async () => identity },
    '@/lib/supabase/admin': { createAdminClient: () => ({ rpc }) },
  }).POST
}
test('ticket replies require authentication', async () => {
  const route = replyRoute(null, () => { throw new Error('must not call') })
  assert.equal((await route({ json: async () => ({ action: 'reply', message: 'test' }) }, { params: Promise.resolve({ id: ticketId }) })).status, 401)
})
test('ticket actor and owner come from the server, never request input', async () => {
  let args
  const route = replyRoute({ id: 'owner-id' }, async (name, data) => { args = data; return { data: { id: ticketId }, error: null } })
  const response = await route({ json: async () => ({ action: 'reply', message: 'not solved', p_owner_id: 'other', p_actor: 'support' }) }, { params: Promise.resolve({ id: ticketId }) })
  assert.equal(response.status, 200)
  assert.equal(args.p_owner_id, 'owner-id')
  assert.equal(args.p_actor, 'developer')
})
test('ticket reply validation and ownership failures are explicit', async () => {
  const route = replyRoute({ id: 'owner' }, async () => ({ error: { message: 'ticket_not_found' } }))
  for (const body of [{ action: 'reply', message: '' }, { action: 'close' }, { action: 'reply', message: 'x'.repeat(10001) }]) {
    assert.equal((await route({ json: async () => body }, { params: Promise.resolve({ id: ticketId }) })).status, 400)
  }
  assert.equal((await route({ json: async () => ({ action: 'reply', message: 'test' }) }, { params: Promise.resolve({ id: ticketId }) })).status, 404)
})
test('ticket RPC rows are normalized for object and array response shapes', async () => {
  for (const data of [{ id: ticketId }, [{ id: ticketId }]]) {
    const route = replyRoute({ id: 'owner' }, async () => ({ data, error: null }))
    const response = await route({ json: async () => ({ action: 'resolve' }) }, { params: Promise.resolve({ id: ticketId }) })
    assert.equal(response.status, 200)
    assert.equal((await response.json()).ticket.id, ticketId)
  }
})

test('new app creation accepts an omitted icon and leaves extraction to the backend', async () => {
  const result = await create({ iconFile: null })
  assert.ok(result.sent)
  assert.equal(result.sent.entries.icon, undefined)
})
