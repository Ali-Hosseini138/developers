const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
function load(path, mocks = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { module: mod, exports: mod.exports, URL, require: key => mocks[key] || require(key) })
  return mod.exports
}
const { validateUploadFields, contactFieldErrors } = load('lib/upload-validation.ts', { './app-description': load('lib/app-description.ts') })
const image = { size: 1024, type: 'image/png' }
const fields = { apkFile: { name: 'app.apk', size: 1024 }, name: 'برنامه', nameEn: '', description: 'توضیحات برنامه', descriptionEn: '', packageName: 'com.example.app', categoryId: '12', applicationType: '1', ageLimit: '0', bannerFile: image, backgroundFile: image, iconFile: null, screenshotFiles: [], hasInAppPayment: false, paymentChoice: null, paymentCommitmentAccepted: false, developedForAndroidTv: true, airMouseCompatible: false, website: '', supportEmail: '', changeLog: '' }
test('optional blank contacts and valid full URLs and emails are accepted', () => {
  for (const website of ['', 'https://example.com', 'http://example.com/path?q=1', 'https://مثال.ایران', 'https://192.168.1.2']) assert.equal(Object.keys(contactFieldErrors(website, 'support@example.com')).length, 0)
  assert.equal(Object.keys(contactFieldErrors('', '')).length, 0)
  assert.equal(Object.values(validateUploadFields(fields)).every(errors => !Object.keys(errors).length), true)
})
test('invalid URLs and emails fail before advancing the contact step', () => {
  for (const website of ['example.com', 'https:example.com', 'http:///example.com', 'https://', 'https://bad_domain.com', 'https://example.c', 'https://example.123', 'javascript:alert(1)', 'https://example.com/a b']) assert.ok(contactFieldErrors(website, '').developerWebsite, website)
  for (const email of ['invalid', 'user@', 'a@b', 'a..b@example.com', 'user@bad_domain.com', 'user@example.com:80']) assert.ok(contactFieldErrors('', email).developerEmail, email)
  const errors = validateUploadFields({ ...fields, website: 'example.com', supportEmail: 'bad' })
  assert.ok(errors[4].developerWebsite)
  assert.ok(errors[4].developerEmail)
})
test('every publication step validates its own fields and encoded description limit', () => {
  const errors = validateUploadFields({ ...fields, apkFile: null, name: '', nameEn: 'x'.repeat(256), description: 'x'.repeat(20000), developedForAndroidTv: false, airMouseCompatible: true, descriptionEn: 'x'.repeat(20001), packageName: 'bad name', categoryId: '', applicationType: '3', ageLimit: '-1', bannerFile: null, backgroundFile: null, iconFile: { size: 3 * 1024 * 1024, type: 'image/png' }, screenshotFiles: Array(11).fill(image), hasInAppPayment: true, paymentChoice: null, changeLog: 'x'.repeat(5001) })
  assert.ok(errors[1].apkFile)
  for (const key of ['name', 'nameEn', 'longDescription', 'longDescriptionEn', 'packageName', 'categoryId', 'applicationType', 'ageLimit', 'banner', 'backgroundImage', 'icon', 'screenshots']) assert.ok(errors[2][key], key)
  assert.ok(errors[3].paymentCommitmentAccepted)
  assert.ok(errors[4].changeLog)
})

test('contact step disables Next for invalid values and exposes the inline correction', () => {
  const source = fs.readFileSync('app/upload/page.tsx', 'utf8')
  const names = [...source.matchAll(/const \[(\w+)[^\]]*\] = useState/g)].map(match => match[1])
  function render(website, supportEmail = '') {
    let index = 0
    const mocks = Object.fromEntries([...source.matchAll(/from '([^']+)'/g)].map(match => [match[1], new Proxy({}, { get: (_, key) => key === '__esModule' ? true : () => null })]))
    mocks.react = { useState: initial => { const key = names[index++]; const value = { step: 4, website, supportEmail, touchedFields: { developerWebsite: true, developerEmail: true } }[key]; return [value === undefined ? initial : value, () => {}] }, useRef: value => ({ current: value }), useMemo: fn => fn(), useEffect() {} }
    mocks['@/lib/upload-validation'] = { validateUploadFields }
    mocks['@/components/store-provider'] = { useStore: () => ({ user: { id: '91' }, authReady: true }) }
    const mod = { exports: {} }
    vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module: mod, exports: mod.exports, require: key => mocks[key] || require(key) })
    const nodes = []
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children) }
    visit(mod.exports.default())
    return nodes
  }
  for (const [website, email, disabled] of [['example.com', '', true], ['https://example.com', 'bad', true], ['https://example.com', 'support@example.com', false], ['', '', false]]) {
    const nodes = render(website, email)
    const next = nodes.find(node => Array.isArray(node.props?.children) && node.props.children.some(child => typeof child === 'string' && child.includes('گام بعدی')))
    assert.equal(next.props.disabled, disabled, website + ' / ' + email)
    if (website === 'example.com') assert.ok(nodes.find(node => node.props?.name === 'developerWebsite').props.error.includes('https://'))
  }
})
