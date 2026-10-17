const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
function load(file, mocks = {}, extra = '') {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8') + extra, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module: mod, exports: mod.exports, require: name => mocks[name] || require(name), URL, FormData, Response })
  return mod.exports
}
const model = load('lib/developer-hub-model.ts')
const revisions = load('lib/listing-revisions.ts')
const listing = { id: 42, packageName: 'com.example.app', name: 'Approved title', isPublished: true, canEdit: true, canSubmit: true, hasDraft: true, screenshots: [{ id: 1, url: 'https://example.com/current.jpg', weight: 1 }], draft: { name: 'Proposed title', developerWebsite: '', hasInAppPayment: false, iconUrl: null, screenshots: [], changedFields: ['name', 'developer_website', 'icon', 'screenshots'] } }
test('approved listing and draft stay separate, including explicit clears and false values', () => {
  const mapped = model.mapDeveloperHubApp(listing)
  assert.equal(mapped.name, 'Approved title')
  assert.equal(mapped.screenshots.length, 1)
  assert.equal(mapped.hasDraft, true)
  assert.equal(mapped.draft.name, 'Proposed title')
  assert.equal(mapped.draft.website, '')
  assert.equal(mapped.draft.hasInAppPayment, false)
  assert.equal(mapped.draft.screenshots.length, 0)
  assert.equal(mapped.draft.canEdit, true)
  assert.equal(mapped.draft.isPublished, true)
  const afterRejection = model.mapDeveloperHubApp({ ...listing, latestSubmission: { id: 12, status: 'rejected', rejectionReason: 'Replace banner' } })
  assert.equal(afterRejection.draft.name, 'Proposed title')
  assert.equal(afterRejection.rejectionReason, 'Replace banner')
  const locked = model.mapDeveloperHubApp({ ...listing, canEdit: false, canSubmit: false, draft: { ...listing.draft, canEdit: true, canSubmit: true } })
  assert.equal(locked.canEdit, false)
  assert.equal(locked.draft.canEdit, false)
})
test('snake_case changed fields map to readable comparison rows without a short-description section', () => {
  const rows = revisions.listingChangeRows({ current: { name: 'Old', applicationType: 1 }, proposed: { name: 'New', applicationType: 2, shortDescription: 'Auto' }, changedFields: ['name', 'application_type', 'short_description'] })
  assert.deepEqual(Array.from(rows, row => row.key), ['name', 'applicationType'])
  assert.equal(rows[1].current, 1)
  assert.equal(rows[1].proposed, 2)
  assert.equal(revisions.listingValueText('applicationType', 2, {}), 'بازی')
  assert.equal(revisions.listingValueText('categoryId', 12, { category: { id: 12, name: 'چندرسانه‌ای' } }), 'چندرسانه‌ای')
})
test('only explicit metadata-only submissions bypass APK approval requirements', () => {
  assert.equal(revisions.isListingOnlySubmission({ hasApk: false, hasListingChanges: true }), true)
  assert.equal(revisions.isListingOnlySubmission({ apkUrl: null, listingChanges: { current: {}, proposed: {}, changedFields: [] } }), true)
  assert.equal(revisions.isListingOnlySubmission({}), false)
  assert.equal(revisions.isListingOnlySubmission({ hasApk: true, hasListingChanges: true, apkUrl: null }), false)
  assert.equal(revisions.isListingOnlySubmission({ hasApk: false, hasListingChanges: false }), false)
})
async function submit(overrides = {}) {
  const source = fs.readFileSync('app/dashboard/version/[id]/page.tsx', 'utf8')
  const start = source.indexOf('  async function submit(')
  const code = ts.transpileModule(source.slice(start, source.indexOf('\n  return (', start)) + '\nsubmit({ preventDefault() {} })', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  let sent = null, saved = false, error = ''
  const state = { apkFile: null, hasListingDraft: true, canSubmit: true, appId: '42', changes: '', saved: false, submitting: { current: false }, MAX_APK_SIZE: 300 * 1024 * 1024,
    FormData, setSaving() {}, setUploadProgress() {}, setErrorMessage: value => error = value, setSaved: value => saved = value, reloadDeveloperApps: async () => {}, window: { setTimeout() {} }, router: { push() {}, refresh() {} }, developerHubErrorMessage: () => 'rejected', postDeveloperHubMultipart: async (path, form) => { sent = { path, entries: Object.fromEntries(form.entries()) }; return { id: 105, appId: 42, hasApk: false, hasListingChanges: true, status: 'pending_review' } }, ...overrides }
  await vm.runInNewContext(code, state)
  return { sent, saved, error }
}
test('saved listing draft can be submitted without APK or changelog', async () => {
  const result = await submit()
  assert.equal(result.saved, true)
  assert.equal(result.sent.path, '/api/v1/developer-hub/apps/42/submissions/')
  assert.deepEqual(result.sent.entries, {})
})
test('APK and saved draft submit together; existing APK-only flow keeps working', async () => {
  const file = Object.assign(new Blob(['apk']), { name: 'new.apk' })
  for (const hasListingDraft of [true, false]) {
    const result = await submit({ apkFile: file, hasListingDraft, changes: 'New version' })
    assert.equal(result.saved, true)
    assert.ok(result.sent.entries.apkFile)
    assert.equal(result.sent.entries.changeLog, 'New version')
  }
})
test('missing content, locked permissions, in-flight sends and server rejection never claim success', async () => {
  for (const override of [{ hasListingDraft: false }, { canSubmit: false }, { submitting: { current: true } }]) {
    const result = await submit(override)
    assert.equal(result.sent, null)
    assert.equal(result.saved, false)
  }
  const rejected = await submit({ postDeveloperHubMultipart: async () => { throw new Error('active_submission_exists') } })
  assert.equal(rejected.saved, false)
  assert.equal(rejected.error, 'rejected')
})

test('metadata-only admin UI enables approval without client variation or icon selection', () => {
  const file = 'components/admin/admin-submissions.tsx'
  const source = fs.readFileSync(file, 'utf8')
  const mocks = Object.fromEntries([...source.matchAll(/from '([^']+)'/g)].map(match => [match[1], new Proxy({}, { get: (_, key) => key === '__esModule' ? true : () => null })]))
  mocks.react = { useState: value => [value, () => {}], useMemo: fn => fn() }
  mocks['@/lib/listing-revisions'] = revisions
  const { renderDetail } = load(file, mocks, '\nexports.renderDetail = SubmissionDetailView;')
  const base = { id: 105, kind: 'update', canDecide: true, status: 'pending_review', app: { name: 'Approved', category: { id: 12, name: 'TV', isValid: true }, screenshots: [] }, developer: {}, hasApk: false, hasListingChanges: true, listingChanges: { current: { name: 'Approved' }, proposed: { name: 'Proposal' }, changedFields: ['name'] } }
  function nodes(detail, canReviewSubmission = true) {
    const found = []
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); found.push(node); visit(node.props?.children) }
    visit(renderDetail({ detail, canReviewSubmission, onUpdate() {} }))
    return found
  }
  const approval = list => list.find(node => node.props?.onClick && JSON.stringify(node.props.children).includes('تأیید و انتشار'))
  const metadataNodes = nodes(base)
  assert.equal(approval(metadataNodes).props.disabled, false)
  assert.equal(metadataNodes.some(node => node.type === 'select'), false)
  assert.ok(metadataNodes.some(node => node.props?.changes === base.listingChanges))
  const apkNodes = nodes({ ...base, hasApk: true })
  assert.equal(approval(apkNodes).props.disabled, true)
  assert.ok(apkNodes.some(node => node.type === 'select'))
  assert.equal(approval(nodes({ ...base, canDecide: false })), undefined)
  assert.equal(approval(nodes(base, false)), undefined)
})

test('saved automatic summaries and air-mouse text do not leave a draft permanently dirty', () => {
  const { changedDeveloperMetadata } = load('lib/developer-hub-patch.ts')
  const { appDescription } = load('lib/app-description.ts')
  const source = fs.readFileSync('app/dashboard/edit/[id]/page.tsx', 'utf8')
  const start = source.indexOf('  const unsavedChanges =')
  const end = source.indexOf('\n  async function imageDimensions', start)
  const expression = ts.transpileModule(source.slice(start, end) + '\nunsavedChanges', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const baseline = model.mapDeveloperHubApp({ ...listing, draft: { ...listing.draft, shortDescription: 'New description', longDescription: appDescription('New description', true), isAndroidTv: false, isAirMouseCompatible: true } }).draft
  const state = { changedDeveloperMetadata, appDescription, baseline, website: baseline.website, supportEmail: baseline.supportEmail, packageName: baseline.packageName, name: baseline.name, nameEn: baseline.nameEn || '', tagline: baseline.tagline, taglineEn: baseline.taglineEn || '', description: 'New description', descriptionEn: baseline.descriptionEn || '', categoryId: baseline.categoryId ? String(baseline.categoryId) : '', applicationType: '1', ageLimit: '0', supportsNetboxPayment: false, developedForAndroidTv: false, airMouseCompatible: true, hasInAppPayment: false, paymentCommitmentAccepted: false, removeIcon: false, clearScreenshots: false, iconFile: null, bannerFile: null, backgroundFile: null, replacementScreenshots: [] }
  assert.equal(vm.runInNewContext(expression, state), false)
})
