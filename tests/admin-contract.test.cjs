const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const source = fs.readFileSync('components/admin/admin-submissions.tsx', 'utf8')
const errorMessage = vm.runInNewContext(ts.transpileModule(source.slice(source.indexOf('function errorMessage'), source.indexOf('export function AdminSubmissions')) + '\nerrorMessage', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText)
async function decide(overrides = {}) {
  let calls = [], error = '', fields = {}, updated = null, reloaded = false
  const start = source.indexOf('  async function decide(')
  const code = ts.transpileModule(source.slice(start, source.indexOf('\n  return (', start)) + "\ndecide('approve')", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const detail = { id: 42, kind: 'new', canDecide: true, hasUnknownPermissions: true }
  const payload = { code: 'recheck_failed', message: 'changed', problems: ['duplicate hash'] }
  const state = { busy: null, detail, canReviewSubmission: true, canApprove: true, clientVariation: 'NETBOX', netboxUserOnly: false, iconSource: 'USER', createUnknownPermissions: true, reason: '',
    setBusy() {}, setActionError: v => error = v, setFieldErrors: v => fields = v, developerHubFieldErrors: ({ payload }) => payload,
    errorMessage, onUpdate: v => updated = v, window: { location: { reload() { reloaded = true }, assign() {} } },
    fetch: async (url, options) => { calls.push([url, options]); return options?.method === 'POST' ? Response.json(payload, { status: 409 }) : Response.json({ ...detail, canDecide: false, status: 'cancelled' }) }, ...overrides }
  await vm.runInNewContext(code, state)
  return { calls, error, fields, updated, reloaded }
}
test('admin recheck conflicts refresh details and display all problems without pretending to approve', async () => {
  const r = await decide()
  assert.equal(r.calls.length, 2)
  assert.equal(r.updated.status, 'cancelled')
  assert.equal(r.reloaded, false)
  assert.ok(r.error.includes('duplicate hash'))
  const body = JSON.parse(r.calls[0][1].body)
  assert.equal(body.clientVariation, 'NETBOX')
  assert.equal(body.iconSource, 'USER')
})
test('admin cannot decide after losing permission or when server denies decision', async () => {
  for (const override of [{ canReviewSubmission: false }, { detail: { id: 42, canDecide: false } }, { canApprove: false }]) assert.equal((await decide(override)).calls.length, 0)
})
test('backend field errors stay distinct from decision conflicts', async () => {
  const r = await decide({ fetch: async () => Response.json({ clientVariation: ['invalid selection'] }, { status: 400 }) })
  assert.equal(r.fields.clientVariation[0], 'invalid selection')
  assert.equal(r.updated, null)
})
test('media guards accept horizontal images and enforce minimum square icon dimensions', async () => {
  for (const path of ['app/upload/page.tsx', 'app/dashboard/edit/[id]/page.tsx']) {
    const code = fs.readFileSync(path, 'utf8'), start = code.indexOf('  async function validateImage(')
    const stop = code.indexOf('\n  function ', start)
    const validate = ts.transpileModule(code.slice(start, stop) + '\nvalidateImage(file, kind)', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
    async function check(kind, width, height) { let error = ''; const result = await vm.runInNewContext(validate, { kind, file: { type: 'image/png', size: 100 }, MAX_ICON_SIZE: 2 * 1024 * 1024, MAX_IMAGE_SIZE: 5 * 1024 * 1024, imageDimensions: async () => ({ width, height }), setErrorMessage: v => error = v }); return { result, error } }
    assert.equal((await check('icon', 127, 127)).result, false)
    assert.equal((await check('icon', 128, 128)).result, true)
    assert.equal((await check('banner', 150, 100)).result, true)
    assert.equal((await check('screenshot', 149, 100)).result, false)
  }
})
