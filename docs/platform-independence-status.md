# Platform independence verification — 2026-10-17

Runtime imports and dependencies for Supabase, Vercel Blob and Vercel Analytics have been removed. Developer identity now comes from the authenticated Django profile, without a shadow user, local identity signature or synthetic terms acceptance.

## Verification

- 103 unit/regression tests passed.
- Next.js standalone production build passed without any Supabase/Blob configuration.
- Standalone Node process started successfully. With a simulated Django backend: login, HttpOnly/Secure cookies, session refresh, public catalog (4 apps), local images, multipart upload forwarding, logout and dashboard HTTP rendering passed. Private legacy file requests returned 404.
- No Supabase/Blob SDK appeared in the traced standalone dependencies.
- 48 referenced legacy files were downloaded, byte counts and SHA256 verified. Public metadata and 18 image references (12 unique images) were preserved locally. Original files, private records and account email mapping are in a separate private migration archive; no passwords, password hashes or API credentials were exported.

Reproduce the isolated HTTP smoke test (test build only):

```sh
SELF_HOSTED=1 DEVELOPER_API_BASE_URL=http://127.0.0.1:4901 npm run build
node scripts/smoke-independent.mjs
```

Rebuild with the actual backend origin before release. The smoke test uses a simulated backend and does not prove production API/storage readiness, browser interaction, Docker/nginx configuration or a 300 MB upload. Docker/nginx were not available in the execution environment.

## Remaining operational work

1. Provision/select the independent server, configure HTTPS and move DNS after acceptance testing. The existing live site remains on its current host until this is done.
2. Backend team: import legacy records/files into Django with verified ownership mapping; confirm migration deployment, email URLs, worker/cron operation and independent storage of new files.
3. Supply the public catalog API contract. Until then the preserved public catalog is a snapshot, not an automatically updated list of new Django publications.
4. Validate the real deployment with the retired services unreachable; retain the old projects until migration reconciliation and recovery checks pass.
