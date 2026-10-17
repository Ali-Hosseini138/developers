const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
function handler(api, profile) {
  const mod = { exports: {} }, logs = [], cookies = []
  const code = ts.transpileModule(fs.readFileSync('app/api/auth/login/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, AbortSignal, console: { error: (...args) => logs.push(args) }, require: name => ({
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200, cookies: { set: (...args) => cookies.push(args) } }) } },
    '@/lib/developer-api': { developerApi: (path, init) => path.endsWith('/profile/') ? (profile ? profile(path, init) : Response.json({ id: 27, email: 'example@example.com' })) : api(path, init), ACCESS_COOKIE: 'access', REFRESH_COOKIE: 'refresh', EMAIL_COOKIE: 'email', authCookieOptions: () => ({ httpOnly: true }) },
    '@/lib/developer-profile': { mapDeveloperProfile: value => ({ ...value, id: String(value.id) }) },
  })[name] })
  return { post: () => mod.exports.POST({ json: async () => ({ email: 'Example@Example.com', password: 'private-password' }) }), logs, cookies }
}
test('login preserves backend validation response without creating a local owner', async () => {
  const h = handler(async () => Response.json({ detail: 'invalid credentials' }, { status: 400 }), () => { throw Error('must not run') })
  assert.equal((await h.post()).status, 400)
  assert.equal(h.logs.length, 0)
})
test('transport failures log only stage and codes, never passwords', async () => {
  const h = handler(async () => { throw Object.assign(Error('private-password'), { cause: { code: 'ECONNRESET' } }) })
  assert.equal((await h.post()).status, 502)
  assert.equal(h.logs[0][1].stage, 'backend_login')
  assert.equal(h.logs[0][1].code, 'ECONNRESET')
  assert.ok(!JSON.stringify(h.logs).includes('private-password'))
})
test('profile preparation failure is distinguished from backend connection failure', async () => {
  const h = handler(async () => Response.json({ access: 'access', refresh: 'refresh' }), async () => { throw Error('database') })
  const r = await h.post()
  assert.equal(r.status, 502)
  assert.ok(r.body.detail.includes('اطلاعات حساب'))
  assert.equal(h.logs[0][1].stage, 'developer_profile')
})
test('successful login uses backend identity and retires bridge cookies', async () => {
  const h = handler(async () => Response.json({ access: 'access', refresh: 'refresh' }), async () => Response.json({ id: 27, email: 'example@example.com', termsAcceptedAt: null }))
  assert.equal((await h.post()).status, 200)
  assert.equal(h.cookies.length, 4)
  assert.ok(h.cookies.some(item => item[0] === 'owner' || item[0] === 'developer_owner'))
})
