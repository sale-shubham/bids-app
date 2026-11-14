# Deployment (frontend, AWS Amplify)

Next.js 16 SSR on Amplify Hosting, platform **WEB_COMPUTE**. Build spec: `amplify.yml` (Node 24, `npm ci`, writes server-only vars into `.env.production`, `npm run build`, artifacts `.next`). CI (`.github/workflows/dev_build.yml`) runs `npm run check` and a build with placeholder public vars on PRs to `dev`/`main`.

## Create the app
1. Amplify Console -> Create new app -> **GitHub** -> authorise -> repo `bids-app` -> branch `dev`.
2. Platform: Web compute (Next.js SSR). Build settings: use the repo's `amplify.yml`. If Node 24 is not picked up by `nvm`, set Node 24 in App settings -> Build settings (build image).
3. Add the environment variables below for the branch, deploy, then connect further branches (e.g. `main`) with their own values.

## Environment variables (per branch)
| Variable | Type | Required | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | build-time | yes | Custom-domain mode: `https://api.<domain>`. Proxy mode: `/api`. |
| `NEXT_PUBLIC_SITE_URL` | build-time | yes | Canonical app URL (sitemap, OG, robots). |
| `NEXT_PUBLIC_IMAGE_ORIGINS` | build-time | yes | Comma-separated CDN/API origins for `next/image`. No picsum in production. |
| `NEXT_PUBLIC_UPLOADS_BASE_URL` | build-time | yes | CloudFront/S3 base for stored image keys. |
| `JWT_SECRET` | server | yes | **Must equal the API's `JWT_SECRET` for the same stage**, or `src/proxy.ts` rejects every `nb_at` cookie. Copied to `.env.production` by `amplify.yml`. |
| `API_PROXY_TARGET` | server | proxy mode only | Raw API Gateway URL, no trailing slash. Copied to `.env.production`. |

Changing a `NEXT_PUBLIC_*` value needs a new build (inlined). Missing values do not crash the build: `next.config.ts` falls back to `http://localhost:4000` and prints a `[next.config]` warning - check the build log.

## Two API modes
1. **Custom domain (recommended).** `NEXT_PUBLIC_API_URL=https://api.example.com`, app on `example.com`/`app.example.com`. API and app share a registrable domain so `nb_at`/`nb_rt` cookies (`Domain=COOKIE_DOMAIN`) are first-party; the API's CORS must allow the app origin with credentials. Leave `API_PROXY_TARGET` unset.
2. **Same-origin proxy (no custom domain).** `API_PROXY_TARGET=<API Gateway URL>`, `NEXT_PUBLIC_API_URL=/api`. `next.config.ts` rewrites `/api/:path*` -> `${API_PROXY_TARGET}/:path*`; the browser and the service worker call `/api/...` on the app origin, so cookies are first-party with no CORS or custom domain. Server-side code (`src/lib/server-api.ts`, the refresh in `src/proxy.ts`) uses the absolute `API_PROXY_TARGET` via `serverApiOrigin()`. `/api/*` is excluded from the auth proxy matcher. Limits: API responses pass through Amplify's compute (extra hop, request time limits); the live WebSocket URL comes from the API's ticket endpoint and connects directly to API Gateway WS, not through `/api`. The API's cookie options must suit the Amplify domain (no `Domain` attribute, or the Amplify domain) and its app URL/CORS settings must point at the Amplify URL.

## Custom domain steps
Amplify -> Domain management -> Add domain -> choose the apex/subdomain per branch (e.g. `dev` -> `dev.example.com`, `main` -> `example.com`) -> add the DNS records Amplify shows (ACM validation CNAME + the CNAME/ALIAS) -> wait for SSL. Then update `NEXT_PUBLIC_SITE_URL`, the API's app URL/CORS origin, and redeploy. In custom-domain mode the API needs its own domain (e.g. `api.example.com` on API Gateway) under the same registrable domain.

## PWA caching notes
- `/sw.js` and `/version.json` are `no-store` via `next.config.ts` headers; do not add CDN/Amplify custom headers that cache them (update prompt and worker replacement depend on it).
- Each build rewrites `public/version.json` (`prebuild` -> `scripts/gen-version.mjs`); clients poll it and offer a reload.
- The worker caches only hashed `/_next/static` assets, never HTML or API calls.
- Push needs the API's VAPID keys (`/push/vapid-public-key`); see push-notifications.md.
