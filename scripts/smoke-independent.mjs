import http from 'node:http'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root=fileURLToPath(new URL('../', import.meta.url))
const backendCalls=[]
const backend=http.createServer(async(req,res)=>{
 const parts=[];for await(const part of req)parts.push(part)
 const body=Buffer.concat(parts).toString()
 backendCalls.push({method:req.method,url:req.url,auth:req.headers.authorization,bytes:Buffer.byteLength(body)})
 res.setHeader('Content-Type','application/json')
 const url=new URL(req.url,'http://localhost')
 if(url.pathname.endsWith('/auth/login/'))res.end(JSON.stringify({access:'fixture-access',refresh:'fixture-refresh',expiresIn:1800}))
 else if(url.pathname.endsWith('/token/refresh/'))res.end(JSON.stringify({access:'fixture-refreshed',expiresIn:1800}))
 else if(url.pathname.endsWith('/profile/')){
  if(!['Bearer fixture-access','Bearer fixture-refreshed'].includes(req.headers.authorization)){res.statusCode=401;res.end('{}');return}
  res.end(JSON.stringify({id:91,email:'fixture@example.com',accountType:'individual',firstName:'Sara',lastName:'Ahmadi',mobile:'+989121234567',identityNumber:'0123456789',companyName:'',termsAcceptedAt:'2026-10-17T00:00:00Z'}))
 }else if(url.pathname.endsWith('/apps/') && req.method==='POST'){
  assert.match(req.headers['content-type'],/multipart\/form-data/);assert.ok(body.includes('fixture.apk'));assert.equal(req.headers.authorization,'Bearer fixture-access')
  res.statusCode=201;res.end(JSON.stringify({id:42,status:'processing'}))
 }else if(url.pathname.endsWith('/apps/'))res.end(JSON.stringify({count:0,results:[],next:null}))
 else if(url.pathname.endsWith('/logout/'))res.end(JSON.stringify({detail:'ok'}))
 else {res.statusCode=404;res.end('{}')}
})
await new Promise(r=>backend.listen(4901,'127.0.0.1',r))
fs.cpSync(root+'/public',root+'/.next/standalone/public',{recursive:true})
fs.mkdirSync(root+'/.next/standalone/.next',{recursive:true})
fs.cpSync(root+'/.next/static',root+'/.next/standalone/.next/static',{recursive:true})
const log=fs.openSync(root+'/.next/independent-smoke.log','w')
// Run after a standalone build using DEVELOPER_API_BASE_URL=http://127.0.0.1:4901.
const app=spawn(process.execPath,[root+'/.next/standalone/server.js'],{cwd:root,env:{PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'production',PORT:'4902',HOSTNAME:'127.0.0.1',DEVELOPER_API_BASE_URL:'http://127.0.0.1:4901'},stdio:['ignore',log,log]})
try {
 let ready=false
 for(let i=0;i<50;i++){try{const r=await fetch('http://127.0.0.1:4902/api/health');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,100))}
 assert.ok(ready,'standalone startup')
 const origin='http://127.0.0.1:4902'
 const login=await fetch(origin+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'fixture@example.com',password:'fixture'})})
 assert.equal(login.status,200)
 assert.equal((await login.json()).user.id,'91')
 const setCookies=login.headers.getSetCookie()
 assert.ok(setCookies.filter(c=>c.startsWith('developer_access=')||c.startsWith('developer_refresh=')).every(c=>c.includes('HttpOnly')&&c.includes('Secure')))
 const cookie=setCookies.filter(c=>c.startsWith('developer_access=')||c.startsWith('developer_refresh=')).map(c=>c.split(';')[0]).join('; ')
 const session=await fetch(origin+'/api/auth/session',{headers:{Cookie:cookie}})
 assert.equal(session.status,200);assert.equal((await session.json()).user.email,'fixture@example.com')
 const catalog=await (await fetch(origin+'/api/catalog')).json();assert.equal(catalog.apps.length,4)
 for(const url of [catalog.apps[0].icon,catalog.apps[0].banner])assert.equal((await fetch(origin+url)).status,200)
 assert.equal((await fetch(origin+'/api/blob-file?pathname=users/private/file.apk')).status,404)
 const multipart=new FormData();multipart.append('apkFile',new Blob(['fixture']), 'fixture.apk')
 const upload=await fetch(origin+'/backend-api/api/v1/developer-hub/apps/',{method:'POST',headers:{Authorization:'Bearer fixture-access'},body:multipart})
 assert.equal(upload.status,201);assert.equal((await upload.json()).id,42)
 assert.equal((await fetch(origin+'/api/auth/logout',{method:'POST',headers:{Cookie:cookie}})).status,200)
 const dashboard=await fetch(origin+'/dashboard');assert.equal(dashboard.status,200)
 console.log(JSON.stringify({standalone:true,login:true,session:true,cookieSecurity:true,publicCatalog:4,localImages:true,privateFileDenied:true,multipartProxy:true,logout:true,dashboardRenders:true,backendCalls:backendCalls.map(c=>({method:c.method,url:c.url}))},null,2))
}finally{app.kill('SIGTERM');backend.close();fs.closeSync(log)}
