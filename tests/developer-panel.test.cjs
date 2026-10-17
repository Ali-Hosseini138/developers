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
  const state = { ...description, saving: false, submitting: { current: false }, submitted: false, mediaBusy: false, setSubmitted() {}, requirementsValid: true, name: 'App', nameEn: '', website: '', supportEmail: '', description: 'Full description', descriptionEn: '',
    apkFile: file, iconFile: file, bannerFile: file, backgroundFile: file, screenshotFiles: [], packageName: 'com.real.app', categoryId: '12', applicationType: '1', ageLimit: '0',
    supportsNetboxPayment: true, hasInAppPayment: true, paymentCommitmentAccepted: true, developedForAndroidTv: false, airMouseCompatible: true, changeLog: '',
    validation: {}, clientErrors: {}, setTouchedFields() {}, setFieldErrors() {}, setErrorMessage: value => error = value, setSaving() {}, setSubmitProgress() {}, setSubmitStage() {}, setStep() {},
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
test('new app creation accepts an omitted icon and leaves extraction to the backend', async () => {
  const result = await create({ iconFile: null })
  assert.ok(result.sent)
  assert.equal(result.sent.entries.icon, undefined)
})

test('accepted app upload is not reported as failed when dashboard reload is unavailable', async () => {
  const result = await create({ reloadDeveloperApps: async () => { throw new Error('offline') } })
  assert.ok(result.sent)
  assert.equal(result.error, '')
})

test('app contact fields are sent separately from the account login email', async () => {
  const result = await create({ website: 'https://app.example.com', supportEmail: 'help@app.example.com' })
  assert.equal(result.sent.entries.developerWebsite, 'https://app.example.com')
  assert.equal(result.sent.entries.developerEmail, 'help@app.example.com')
})

test('one-month commitment sends accepted commitment without claiming implemented payment support', async () => {
  const result = await create({ supportsNetboxPayment: false, paymentCommitmentAccepted: true })
  assert.equal(result.sent.entries.hasInAppPayment, 'true')
  assert.equal(result.sent.entries.supportsNetboxPayment, 'false')
  assert.equal(result.sent.entries.paymentCommitmentAccepted, 'true')
})

test('both payment radio selections record consent directly without an extra checkbox', () => {
  const source = fs.readFileSync('app/upload/page.tsx', 'utf8')
  const names = [...source.matchAll(/const \[(\w+)[^\]]*\] = useState/g)].map(match => match[1])
  let index = 0
  const changed = {}
  const mod = { exports: {} }
  const react = { useState(initial) { const key = names[index++]; const value = { step: 3, hasInAppPayment: true, developedForAndroidTv: true }[key]; return [value === undefined ? initial : value, next => changed[key] = next] }, useRef: value => ({ current: value }), useMemo: fn => fn(), useEffect() {} }
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: key => {
    if (key === 'react') return react
    if (key === 'react/jsx-runtime') return require(key)
    if (key === 'next/navigation') return { useRouter: () => ({}) }
    if (key === '@/lib/upload-validation') return { validateUploadFields: () => ({ 1: {}, 2: {}, 3: {}, 4: {} }) }
    if (key === '@/components/store-provider') return { useStore: () => ({ user: { id: '91' }, authReady: true }) }
    return new Proxy({}, { get: (_, name) => name === '__esModule' ? true : () => null })
  } })
  const nodes = []
  function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children) }
  visit(mod.exports.default())
  const choices = nodes.filter(node => node.type === 'input' && node.props.name === 'payment-choice')
  assert.equal(choices.length, 2)
  assert.equal(nodes.filter(node => node.type === 'input' && node.props.type === 'checkbox').length, 0)
  choices[0].props.onChange()
  assert.equal(changed.supportsNetboxPayment, true)
  assert.equal(changed.paymentCommitmentAccepted, true)
  choices[1].props.onChange()
  assert.equal(changed.supportsNetboxPayment, false)
  assert.equal(changed.paymentCommitmentAccepted, true)
})

test('category selection returns its backend name alongside the numeric identifier', () => {
  let index = 0, selected
  const category = { id: 12, name: 'چندرسانه‌ای', parentId: null }
  const component = load('components/upload/developer-category-select.tsx', {
    react: { useState: value => [index++ === 0 ? [category] : value, () => {}], useEffect() {} },
    '@/components/ui/button': { Button() {} },
    '@/components/ui/select': { Select() {}, SelectTrigger() {}, SelectValue() {}, SelectContent() {}, SelectItem() {} },
  })
  const tree = component.DeveloperCategorySelect({ value: '', onChange: (id, name) => selected = { id, name } })
  tree.props.children[0].props.onValueChange('12')
  assert.deepEqual(selected, { id: '12', name: 'چندرسانه‌ای' })
})

test('final submission returns to the invalid contact step without uploading', async () => {
  let step
  const result = await create({ validation: { 4: { developerWebsite: 'invalid' } }, clientErrors: { developerWebsite: 'invalid' }, setStep: value => step = value })
  assert.equal(step, 4)
  assert.equal(result.sent, undefined)
})
