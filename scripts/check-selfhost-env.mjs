import { pathToFileURL } from 'node:url'

export function validateSelfhostEnv(env) {
  const errors = []
  const value = env.DEVELOPER_API_BASE_URL
  if (!value || /^(REPLACE_|YOUR_)/.test(value)) errors.push('DEVELOPER_API_BASE_URL: required')
  else {
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' || value !== url.origin || url.username || url.password) throw new Error()
    } catch { errors.push('DEVELOPER_API_BASE_URL: must be an HTTPS origin without a trailing slash') }
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
