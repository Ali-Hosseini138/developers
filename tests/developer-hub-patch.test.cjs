const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('lib/developer-hub-patch.ts', 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
vm.runInNewContext(output, { module: mod, exports: mod.exports })
const { changedDeveloperMetadata, unconfirmedDeveloperMetadata, developerMetadataLabels } = mod.exports
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

async function runSave(mode, overrides = {}) {
  const source = fs.readFileSync('app/dashboard/edit/[id]/page.tsx', 'utf8')
  const start = source.indexOf('  async function save(')
  const code = ts.transpileModule(source.slice(start, source.indexOf('\n  return (', start)) + '\nsave({ preventDefault() {} })', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const result = { saved: false, warning: '', notice: '', error: '', calls: [] }
  const state = {
    baseline: app, app, appId: '42', saving: false, submitting: { current: false }, mediaBusy: false, clearScreenshots: false, setClearScreenshots() {}, hasInAppPayment: true, paymentCommitmentAccepted: false, removeIcon: false,
    website: '', supportEmail: '', packageName: mode === 'noop' ? app.packageName : 'com.real.app', name: app.name, nameEn: '',
    tagline: app.tagline, taglineEn: '', description: app.description, descriptionEn: '',
    categoryId: '12', applicationType: '1', ageLimit: '0', supportsNetboxPayment: false,
    developedForAndroidTv: true, airMouseCompatible: false,
    iconFile: null, bannerFile: null, backgroundFile: null, replacementScreenshots: [], FormData,
    changedDeveloperMetadata, unconfirmedDeveloperMetadata, developerMetadataLabels, shortAppDescription: text => text.trim().slice(0, 1000), appDescription: text => `این برنامه با ایرماوس قابل استفاده است\n${text.trim()}`,
    setFieldErrors() {}, setSaving() {}, setUploadProgress() {}, setBaseline() {},
    setIconPreview() {}, setBannerPreview() {}, setBackgroundPreview() {}, setRemoveIcon() {}, setIconFile() {}, setBannerFile() {}, setBackgroundFile() {}, setReplacementScreenshots() {}, setReplacementPreviews() {}, setPaymentCommitmentAccepted() {},
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
    ...overrides,
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
  assert.ok(r.warning.includes('پکیج‌نیم'))
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

test('multipart CRLF line endings do not turn a saved description into a mismatch', async () => {
  const form = new FormData()
  form.append('longDescription', 'first\nsecond')
  const serialized = await new Request('http://localhost', { method: 'PATCH', body: form }).text()
  assert.ok(serialized.includes('first\r\nsecond'))
  assert.equal(unconfirmedDeveloperMetadata({ longDescription: 'first\nsecond' }, { longDescription: 'first\r\nsecond' }).length, 0)
  assert.equal(unconfirmedDeveloperMetadata({ longDescription: 'first\nsecond' }, { longDescription: 'first\r\nDIFFERENT' }).length, 1)
})
test('correcting only the package of a legacy air-mouse app does not rewrite its description', async () => {
  const baseline = { ...app, developedForAndroidTv: false, airMouseCompatible: true }
  const r = await runSave('success', { baseline, app: baseline, developedForAndroidTv: false, airMouseCompatible: true })
  assert.equal(JSON.stringify(r.calls[0][2]), JSON.stringify([['packageName', 'com.real.app']]))
  assert.equal(r.saved, true)
})
test('a saved package is confirmed separately when another field was not saved', async () => {
  const r = await runSave('success', { name: 'New name' })
  assert.equal(r.saved, false)
  assert.ok(r.notice.includes('com.real.app'))
  assert.ok(r.warning.includes('عنوان فارسی'))
  assert.ok(!r.warning.includes('پکیج‌نیم'))
})

test('enabling in-app payment requires explicit commitment before any PATCH', async () => {
  const baseline = { ...app, hasInAppPayment: false }
  const r = await runSave('success', { baseline, hasInAppPayment: true, paymentCommitmentAccepted: false })
  assert.equal(r.calls.length, 0)
  assert.ok(r.error.includes('تعهد'))
})
test('payment edits send the new flag and commitment; acceptance is verified through its timestamp', async () => {
  const baseline = { ...app, hasInAppPayment: false }
  const r = await runSave('success', { baseline, hasInAppPayment: true, paymentCommitmentAccepted: true })
  const entries = Object.fromEntries(r.calls[0][2])
  assert.equal(entries.hasInAppPayment, 'true')
  assert.equal(entries.paymentCommitmentAccepted, 'true')
  assert.equal(unconfirmedDeveloperMetadata({ hasInAppPayment: 'true', paymentCommitmentAccepted: 'true' }, { hasInAppPayment: true, paymentCommitmentAcceptedAt: '2026-10-15T12:00:00Z' }).length, 0)
  assert.equal(unconfirmedDeveloperMetadata({ paymentCommitmentAccepted: 'true' }, {}).length, 1)
})
test('removing the icon sends the explicit removal flag', async () => {
  const r = await runSave('noop', { removeIcon: true })
  assert.equal(Object.fromEntries(r.calls[0][2]).removeIcon, 'true')
  assert.equal(Object.fromEntries(r.calls[0][2]).icon, undefined)
})

test('expired verification session returns to login without claiming persistence', async () => {
  let target = ''
  const r = await runSave('success', { fetch: async () => ({ status: 401, ok: false }), window: { location: { assign: value => target = value } } })
  assert.equal(r.saved, false)
  assert.ok(target.startsWith('/login?next='))
})

test('non-TV edits require air-mouse compatibility before sending metadata', async () => {
  const result = await runSave('success', { developedForAndroidTv: false, airMouseCompatible: false })
  assert.equal(result.calls.length, 0)
  assert.ok(result.error.includes('ایرماوس'))
})
test('successful media mutation clears pending file inputs even when readback is unavailable', async () => {
  let cleared = 0
  const result = await runSave('unavailable', {
    bannerFile: new Blob(['png'], { type: 'image/png' }),
    setIconFile(value) { if (value === null) cleared++ }, setBannerFile(value) { if (value === null) cleared++ },
    setBackgroundFile(value) { if (value === null) cleared++ }, setReplacementScreenshots(value) { if (value.length === 0) cleared++ },
  })
  assert.equal(cleared, 4)
  assert.equal(result.error, '')
  assert.ok(result.warning)
})

test('contact fields support sparse updates, clearing and persistence verification', () => {
  const patch = changedDeveloperMetadata({ ...app, website: 'https://old.example', supportEmail: 'old@example.com' }, { ...fields, developerWebsite: '', developerEmail: 'new@example.com' })
  assert.equal(patch.developerWebsite, '')
  assert.equal(patch.developerEmail, 'new@example.com')
  assert.equal(unconfirmedDeveloperMetadata(patch, { developerWebsite: '', developerEmail: 'new@example.com' }).length, 0)
  assert.equal(unconfirmedDeveloperMetadata(patch, { developerWebsite: 'https://old.example', developerEmail: 'new@example.com' }).length, 1)
})

test('published app save verifies the proposed draft instead of the approved root listing', async () => {
  const published = { ...app, isPublished: true }
  const result = await runSave('success', { app: published, baseline: published, packageName: app.packageName, name: 'Proposed title', fetch: async () => ({ ok: true, json: async () => ({ id: 42, isPublished: true, name: app.name, hasDraft: true, draft: { name: 'Proposed title' } }) }) })
  assert.equal(result.saved, true)
  assert.ok(result.notice.includes('پیش‌نویس'))
  assert.deepEqual(Object.fromEntries(result.calls[0][2]), { name: 'Proposed title' })
})
test('an approved root value cannot falsely confirm a missing published draft', () => {
  assert.equal(unconfirmedDeveloperMetadata({ name: 'Title' }, { isPublished: true, name: 'Title', draft: null }).length, 1)
  assert.equal(unconfirmedDeveloperMetadata({ name: 'Proposed' }, { isPublished: true, name: 'Current', draft: { name: 'Proposed' } }).length, 0)
})
test('screenshot deletion sends its own flag and never sends replacement files', async () => {
  const result = await runSave('noop', { clearScreenshots: true })
  const entries = Object.fromEntries(result.calls[0][2])
  assert.equal(entries.clearScreenshots, 'true')
  assert.equal(entries.screenshots, undefined)
})
