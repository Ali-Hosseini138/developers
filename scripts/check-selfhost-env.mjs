import { pathToFileURL } from 'node:url'

export function validateSelfhostEnv(env) {
  const errors = []
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'DEVELOPER_API_BASE_URL']) {
    if (!env[name] || /^(REPLACE_|YOUR_)/.test(env[name])) errors.push(`${name}: required`)
  }
  for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'DEVELOPER_API_BASE_URL']) {
    try {
      const value = env[name]
      const url = new URL(value)
      if (url.protocol !== 'https:' || value !== url.origin || url.username || url.password || url.hostname.includes('YOUR_PROJECT')) throw new Error()
    } catch {
      errors.push(`${name}: must be an HTTPS origin without a trailing slash`)
    }
  }
  return errors
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = validateSelfhostEnv(process.env)
  if (errors.length) {
    console.error(`Self-host configuration invalid:\n${errors.join('\n')}`)
    process.exitCode = 1
  }
}
