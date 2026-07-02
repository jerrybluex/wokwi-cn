# Wokwi-CN Deployment Guide

## Architecture

```
Browser (Vercel CDN)
    │
    ├── /               → Vercel Frontend (apps/web)
    ├── /api/*          → rewrite → Railway Backend
    └── /health         → rewrite → Railway Backend
```

- **Frontend**: Vercel (monorepo, `pnpm --filter @wokwi/web build`)
- **Backend**: Railway (Node.js/Express, `apps/server`)
- **Database**: SQLite (MVP) → PostgreSQL (production)
- **AI**: DeepSeek API (key in server env)
- **Monitoring**: Sentry (frontend DSN via Vercel env var)

---

## Frontend Deploy (Vercel)

### Automatic (main branch push)
1. Vercel detects push to `main` → triggers build
2. Build: `pnpm --filter @wokwi/web build`
3. Output: `apps/web/dist`
4. Env vars injected from Vercel dashboard (`VITE_API_BASE`, `VITE_SENTRY_DSN`)

### Manual CLI deploy
```bash
npm i -g vercel
cd /Volumes/MOVESPEED/Dev/wokwi-cn
vercel --prod
```

### Vercel env vars (dashboard)
| Key | Value | Required |
|-----|-------|----------|
| `VITE_API_BASE` | `https://wokwi-server.up.railway.app` | Yes |
| `VITE_SENTRY_DSN` | `@sentry_web_dsn` (reference) | Optional |

> **NOTE**: `@sentry_web_dsn` is a Vercel secret. Create via:
> `vercel env add VITE_SENTRY_DSN` → paste Sentry DSN value → choose Production

---

## Backend Deploy (Railway)

### Setup
1. Connect GitHub repo to Railway
2. Set root directory: `apps/server`
3. Build command: `pnpm install && npx prisma migrate deploy`
4. Start command: `node dist/index.js`

### Railway env vars (dashboard → Variables)
| Key | Example | Required |
|-----|---------|----------|
| `DATABASE_URL` | `postgresql://user:pass@host/db` | Yes |
| `JWT_SECRET` | `<64-char random string>` | Yes |
| `WEB_ORIGIN` | `https://wokwi-cn.vercel.app` | Yes |
| `DEEPSEEK_API_KEY` | `sk-...` | Yes |
| `DEEPSEEK_MODEL` | `deepseek-chat` | No (default: deepseek-chat) |
| `DEEPSEEK_MAX_TOKENS` | `600` | No (default: 400) |
| `SENTRY_DSN` | `https://...@sentry.io/...` | Optional |
| `RESEND_API_KEY` | `re_...` | Optional (stub if empty) |
| `EMAIL_FROM` | `Wokwi <noreply@example.com>` | Optional |
| `EMAIL_REPLY_TO` | `support@example.com` | Optional |

### Database Migration (before first deploy or after schema change)
```bash
cd apps/server
npx prisma migrate deploy
# Or from root:
pnpm --filter @wokwi/server prisma migrate deploy
```

---

## Post-Deploy Checklist

- [ ] `https://<railway-app>.up.railway.app/health` returns 200
- [ ] Frontend loads without CORS errors (check browser console)
- [ ] AI tutor responds (DeepSeek key valid)
- [ ] Sentry receives events (if DSN configured)
- [ ] Email sends (if RESEND_API_KEY configured)

---

## Rollback

- **Vercel**: Dashboard → Deployments → find last working → "Preview" → "Promote to Production"
- **Railway**: Dashboard → Deployments → find last working → ⋯ → "Redeploy"

---

## Monitoring

### Sentry
- Frontend: `VITE_SENTRY_DSN` (Vercel env var)
- Backend: `SENTRY_DSN` (Railway env var)
- Both point to the same Sentry project
- Without DSN: app logs warning and continues (no crash)

### Logs
- Railway: Dashboard → Deployments → Logs
- Vercel: Dashboard → Functions → function logs

---

## Environment Variables Reference

See `apps/server/.env.example` for all server-side variables.

### Frontend (Vite build-time)
| Variable | Source | Notes |
|----------|--------|-------|
| `VITE_API_BASE` | Vercel dashboard | Backend URL |
| `VITE_SENTRY_DSN` | Vercel dashboard | Sentry frontend DSN |
