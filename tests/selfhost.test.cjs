const { test } = require('node:test')
const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const { resolve } = require('node:path')

test('standalone is opt-in and Django upload rewrites keep their trailing slash', async () => {
  const before = process.env.SELF_HOSTED
  try {
    delete process.env.SELF_HOSTED
    const configUrl = pathToFileURL(resolve('next.config.mjs'))
    const normal = (await import(`${configUrl}?normal`)).default
    assert.equal(normal.output, undefined)
    process.env.SELF_HOSTED = '1'
    const standalone = (await import(`${configUrl}?standalone`)).default
    assert.equal(standalone.output, 'standalone')
    assert.equal(standalone.skipTrailingSlashRedirect, true)
    assert.deepEqual(await standalone.rewrites(), await normal.rewrites())
    assert.ok((await standalone.rewrites())[0].destination.endsWith('/:path*/'))
  } finally {
    if (before === undefined) delete process.env.SELF_HOSTED
    else process.env.SELF_HOSTED = before
  }
})

test('self-host configuration fails closed without printing credential values', async () => {
  const { validateSelfhostEnv } = await import(pathToFileURL(resolve('scripts/check-selfhost-env.mjs')))
  const valid = {
    NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'public-key',
    SUPABASE_SERVICE_ROLE_KEY: 'private-secret',
    DEVELOPER_API_BASE_URL: 'https://backend.example',
  }
  assert.deepEqual(validateSelfhostEnv(valid), [])
  for (const value of ['http://backend.example', 'https://backend.example/', 'https://u:secret@backend.example', 'https://backend.example/api', 'https://backend.example?q=1', 'https://backend.example#x', 'https://backend.example;\ninvalid']) {
    const errors = validateSelfhostEnv({ ...valid, DEVELOPER_API_BASE_URL: value })
    assert.ok(errors.length)
    assert.ok(errors.every(error => !error.includes(value) && !error.includes('private-secret')))
  }
  for (const key of Object.keys(valid)) {
    assert.ok(validateSelfhostEnv({ ...valid, [key]: '' }).some(error => error.startsWith(key + ':')))
  }
})
