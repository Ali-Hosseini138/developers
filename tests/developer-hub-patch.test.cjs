const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('lib/developer-hub-patch.ts', 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
vm.runInNewContext(output, { module: mod, exports: mod.exports })
const { changedDeveloperMetadata, unconfirmedDeveloperMetadata } = mod.exports
const app = { id: '42', name: 'App', packageName: 'com.guessed.app', tagline: 'Short', description: 'Long', categoryId: 12, applicationType: 1, ageLimit: 0, supportsNetboxPayment: false, developedForAndroidTv: true, airMouseCompatible: false, hasInAppPayment: true }
const fields = { packageName: app.packageName, name: app.name, nameEn: '', shortDescription: app.tagline, shortDescriptionEn: '', longDescription: app.description, longDescriptionEn: '', categoryId: '12', applicationType: '1', ageLimit: '0', supportsNetboxPayment: false, isAndroidTv: true, isAirMouseCompatible: false }

test('correcting a package name sends only that field; unrelated and immutable payment fields stay out', () => {
  const patch = changedDeveloperMetadata(app, { ...fields, packageName: 'com.real.app' })
  assert.equal(JSON.stringify(patch), JSON.stringify({ packageName: 'com.real.app' }))
})
test('unchanged optional metadata and numeric/boolean normalization create no update', () => {
  assert.equal(Object.keys(changedDeveloperMetadata(app, fields)).length, 0)
})
test('an explicit field clear is preserved without clearing other fields', () => {
  const patch = changedDeveloperMetadata({ ...app, nameEn: 'English' }, fields)
  assert.equal(JSON.stringify(patch), JSON.stringify({ nameEn: '' }))
})
test('old package name returned after a successful PATCH is not confirmation', () => {
  assert.equal(JSON.stringify(unconfirmedDeveloperMetadata({ packageName: 'com.real.app' }, { packageName: 'com.guessed.app' })), JSON.stringify(['packageName']))
})
test('readback confirms the package, numeric category objects and explicit booleans', () => {
  assert.equal(unconfirmedDeveloperMetadata({ packageName: 'com.real.app', categoryId: '12', isAndroidTv: false.toString() }, { packageName: 'com.real.app', category: { id: 12 }, isAndroidTv: false }).length, 0)
  assert.equal(JSON.stringify(unconfirmedDeveloperMetadata({ isAndroidTv: 'false' }, {})), JSON.stringify(['isAndroidTv']))
})

async function runSave(mode) {
  const source = fs.readFileSync('app/dashboard/edit/[id]/page.tsx', 'utf8')
  const start = source.indexOf('  async function save(')
  const code = ts.transpileModule(source.slice(start, source.indexOf('\n  return (', start)) + '\nsave({ preventDefault() {} })', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const result = { saved: false, warning: '', notice: '', error: '', calls: [] }
  const state = {
    baseline: app, app, appId: '42', saving: false,
    packageName: mode === 'noop' ? app.packageName : 'com.real.app', name: app.name, nameEn: '',
    tagline: app.tagline, taglineEn: '', description: app.description, descriptionEn: '',
    categoryId: '12', applicationType: '1', ageLimit: '0', supportsNetboxPayment: false,
    developedForAndroidTv: true, airMouseCompatible: false,
    iconFile: null, bannerFile: null, backgroundFile: null, replacementScreenshots: [], FormData,
    changedDeveloperMetadata, unconfirmedDeveloperMetadata,
    setFieldErrors() {}, setSaving() {}, setUploadProgress() {}, setBaseline() {},
    setErrorMessage(v) { result.error = v }, setSaved(v) { result.saved = v },
    setSaveNotice(v) { result.notice = v }, setSaveWarning(v) { result.warning = v },
    developerHubFieldErrors: () => ({}), developerHubErrorMessage: () => 'PATCH rejected',
    mapDeveloperHubApp: v => v,
    async patchDeveloperHubMultipart(path, form) {
      result.calls.push(['PATCH', path, Array.from(form.entries())])
      if (mode === 'rejected') throw new Error('400')
    },
    async fetch() {
      result.calls.push(['GET'])
      if (mode === 'unavailable') throw new Error('network')
      return { ok: true, json: async () => ({ id: 42, packageName: mode === 'stale' ? app.packageName : 'com.real.app' }) }
    },
    async reloadDeveloperApps() { if (mode === 'reload-failed') throw new Error('network') },
  }
  await vm.runInNewContext(code, state)
  return result
}

test('save sends a sparse PATCH and confirms the corrected package with GET', async () => {
  const r = await runSave('success')
  assert.equal(r.saved, true)
  assert.equal(JSON.stringify(r.calls), JSON.stringify([['PATCH', '/api/v1/developer-hub/apps/42/', [['packageName', 'com.real.app']]], ['GET']]))
  assert.ok(r.notice.includes('com.real.app'))
})
test('accepted PATCH with stale readback never reports success', async () => {
  const r = await runSave('stale')
  assert.equal(r.saved, false)
  assert.ok(r.warning.includes('قبلی'))
})
test('rejected PATCH surfaces the failure without a readback', async () => {
  const r = await runSave('rejected')
  assert.equal(r.error, 'PATCH rejected')
  assert.equal(r.saved, false)
  assert.equal(r.calls.length, 1)
})
test('failed verification is distinguished from rejected saving', async () => {
  const r = await runSave('unavailable')
  assert.equal(r.saved, false)
  assert.equal(r.error, '')
  assert.ok(r.warning.includes('به معنی ردشدن ذخیره نیست'))
})
test('dashboard refresh failure preserves confirmed save', async () => {
  const r = await runSave('reload-failed')
  assert.equal(r.saved, true)
  assert.ok(r.warning.includes('تازه‌سازی'))
})
test('unchanged form makes no API request', async () => {
  const r = await runSave('noop')
  assert.equal(r.calls.length, 0)
})
