# Platform independence verification — 2026-10-17

Runtime imports and dependencies for Supabase, Vercel Blob and Vercel Analytics have been removed. Developer identity now comes from the authenticated Django profile, without a shadow user, local identity signature or synthetic terms acceptance.

## Verification

- 103 unit/regression tests passed.
- Next.js standalone production build passed without any Supabase/Blob configuration.
- Standalone Node process started successfully. With a simulated Django backend: login, HttpOnly/Secure cookies, session refresh, empty public catalog, local assets, multipart upload forwarding, logout and dashboard HTTP rendering passed. Private legacy file requests returned 404.
- No Supabase/Blob SDK appeared in the traced standalone dependencies.
- The owner confirmed all previous data was disposable test data. The old public catalog/media and temporary migration archive are not retained in the new runtime. Source services are cleaned after the new release; no legacy data import into Django is required.

Reproduce the isolated HTTP smoke test (test build only):

```sh
SELF_HOSTED=1 DEVELOPER_API_BASE_URL=http://127.0.0.1:4901 npm run build
node scripts/smoke-independent.mjs
```

Rebuild with the actual backend origin before release. The smoke test uses a simulated backend and does not prove production API/storage readiness, browser interaction, Docker/nginx configuration or a 300 MB upload. Docker/nginx were not available in the execution environment.

## Remaining operational work

1. Provision/select the independent server, configure HTTPS and move DNS after acceptance testing. The existing live site remains on its current host until this is done.
2. Backend team: confirm schema migration deployment, email URLs, worker/cron operation and independent storage of new files. Legacy test records do not need importing.
3. Supply the public catalog API contract. Until then the public catalog remains empty; the authenticated developer app list continues to use Django.
4. Validate the real deployment with the retired services unreachable; retain the current host until server cutover checks pass. Old test data may be removed as authorized.
