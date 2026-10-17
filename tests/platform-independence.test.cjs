const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), ts = require('typescript')
function load(file, mocks = {}, globals = {}) {
  const mod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText,
    { module: mod, exports: mod.exports, Response, Request, URL, Headers, AbortSignal, require: key => key in mocks ? mocks[key] : require(key), ...globals })
  return mod.exports
}
const profileMapper = load('lib/developer-profile.ts')
const cookieNames={ACCESS_COOKIE:'access',REFRESH_COOKIE:'refresh',EMAIL_COOKIE:'email',authCookieOptions:()=>({httpOnly:true})}
test('login trusts backend profile identity, preserves terms and never needs the legacy identity service', async () => {
  const calls=[],cookies=[]
  const route=load('app/api/auth/login/route.ts',{
    'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200,cookies:{set:(...args)=>cookies.push(args)}})}},
    '@/lib/developer-profile':profileMapper,
    '@/lib/developer-api':{...cookieNames,developerApi:async (url,init)=>{calls.push([url,init]);return Response.json(url.endsWith('/profile/')?{id:91,email:'verified@example.com',firstName:'Sara',lastName:'Ahmadi',termsAcceptedAt:null}:{access:'fresh-access',refresh:'fresh-refresh'})}},
  })
  const response=await route.POST({json:async()=>({email:'input@example.com',password:'private'})})
  assert.equal(response.status,200)
  assert.equal(response.body.user.id,'91');assert.equal(response.body.user.email,'verified@example.com')
  assert.equal(response.body.user.termsAcceptedAt,undefined)
  assert.equal(calls[1][1].headers.Authorization,'Bearer fresh-access')
  assert.ok(cookies.filter(x=>x[0]==='access'||x[0]==='refresh').every(x=>x[2].httpOnly))
})
test('session refresh loads the backend identity and preserves cookies on profile outages', async () => {
  for(const status of [200,503]){
    const writes=[]
    const route=load('app/api/auth/session/route.ts',{
      'next/headers':{cookies:async()=>({get:name=>name==='refresh'?{value:'valid-refresh'}:undefined})},
      'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status||200,headers:new Headers(init?.headers),cookies:{set:(...args)=>writes.push(args)}})}},
      '@/lib/developer-profile':profileMapper,
      '@/lib/developer-api':{...cookieNames,developerApi:async url=>url.endsWith('/profile/')?Response.json({id:91,email:'verified@example.com'},{status}):Response.json({access:'new-access'})},
    })
    const result=await route.GET()
    assert.equal(result.status,status)
    if(status===200){assert.equal(result.body.user.id,'91');assert.equal(writes.length,1)}
    else assert.equal(writes.length,0)
  }
})
test('public catalog starts empty without old test metadata or file references',()=>{
  const catalog=JSON.parse(fs.readFileSync('data/public-catalog.json'))
  assert.deepEqual(catalog.apps,[])
  assert.equal(fs.existsSync('data/legacy-public-media.json'),false)
  assert.equal(fs.existsSync('public/legacy-media'),false)
})
test('retired file endpoint never reconnects to old storage or serves private files',async()=>{
  const route=load('app/api/blob-file/route.ts',{
    'next/server':{NextResponse:{json:(body,init)=>Response.json(body,init)}},
  })
  for(const pathname of ['users/someone/private.apk','__proto__','../../etc/passwd',''])assert.equal((await route.GET(new Request('https://panel.example/api/blob-file?pathname='+encodeURIComponent(pathname)))).status,404)
})
test('runtime sources and declared dependencies do not import retired platform services',()=>{
  function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(/\.(tsx?|mjs)$/.test(file))assert.doesNotMatch(fs.readFileSync(file,'utf8'),/@supabase\/|@vercel\/(analytics|blob)|SUPABASE_SERVICE_ROLE_KEY|BLOB_READ_WRITE_TOKEN/,file)}}
  for(const dir of ['app','components','lib','deploy','scripts'])scan(dir)
  const deps=JSON.parse(fs.readFileSync('package.json')).dependencies
  for(const key of ['@supabase/ssr','@supabase/supabase-js','@vercel/analytics','@vercel/blob'])assert.equal(deps[key],undefined)
})
