const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const vm = require('node:vm')
function load(path, mocks = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: mod, exports: mod.exports, Request, Response, require: key => mocks[key] || require(key) })
  return mod.exports
}
const mapping = load('lib/developer-profile.ts')
function route(api) {
  return load('app/api/developer/profile/route.ts', {
    'next/server': { NextResponse: Response }, '@/lib/developer-profile': mapping,
    '@/lib/developer-api': { developerHubApi: api, copyBackendResponse: (response, payload) => Response.json(payload, { status: response.status }) },
  })
}
const profile = { id: 27, email: 'login@example.com', accountType: 'legal', firstName: 'Sara', lastName: 'Ahmadi', mobile: '+989121234567', identityNumber: '01234567890', companyName: 'Example', termsAcceptedAt: '2026-10-17T00:00:00Z' }
test('profile uses backend JWT helper and maps account fields without changing stored terms', async () => {
  let path
  const result = await route(async value => { path = value; return Response.json(profile) }).GET()
  const { profile: user } = await result.json()
  assert.equal(path, '/api/v1/developer-hub/profile/')
  assert.equal(user.id, '27')
  assert.equal(user.firstName, 'Sara')
  assert.equal(user.phone, profile.mobile)
  assert.equal(user.nationalId, profile.identityNumber)
  assert.equal(user.termsAcceptedAt, profile.termsAcceptedAt)
})
test('profile PATCH only forwards editable camelCase fields and preserves validation errors', async () => {
  let sent
  const { accountType, ...editableProfile } = profile
  const response = await route(async (path, init) => { sent = JSON.parse(init.body); return Response.json({ identityNumber: ['Already registered'] }, { status: 400 }) }).PATCH({ json: async () => ({ ...editableProfile, firstName: ' Sara ', email: 'attacker@example.com', acceptTerms: true, isActive: true }) })
  assert.deepEqual(sent, { firstName: 'Sara', lastName: 'Ahmadi', mobile: profile.mobile, identityNumber: profile.identityNumber, companyName: 'Example' })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { identityNumber: ['Already registered'] })
})
test('read-only profile updates are rejected and backend outages never fabricate success', async () => {
  const handler = route(async () => { throw new Error('outage') })
  assert.equal((await handler.PATCH({ json: async () => ({ email: 'new@example.com', termsAcceptedAt: 'now' }) })).status, 400)
  assert.equal((await handler.GET()).status, 502)
})

for (const accountType of ['individual', 'legal']) {
  test(`profile PATCH rejects account type ${accountType} without contacting backend`, async () => {
    let calls = 0
    const response = await route(async () => { calls++; return Response.json(profile) }).PATCH({ json: async () => ({ accountType, firstName: 'Sara' }) })
    assert.equal(response.status, 400)
    assert.equal((await response.json()).detail, 'نوع حساب پس از ثبت‌نام قابل تغییر نیست.')
    assert.equal(calls, 0)
  })
}
