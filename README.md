# AXIOMFLOW

AXIOMFLOW is a production-style static SaaS website with a local secure NVIDIA AI gateway.

## Run The Website

```powershell
node server.js
```

Open:

```text
http://127.0.0.1:8787/index.html
```

## Free vs Paid Access

The free tier is intentionally limited:

- 2 local previews per day.
- AI Business Finder and Validation Center only.
- No saved dashboard reports.
- No live NVIDIA AI calls.
- No builder, blueprint, marketplace, dashboard, settings, admin, or API workspace access.

Paid users unlock PayPal-verified access, live NVIDIA AI, saved reports, dashboards, launch blueprints, builders, marketplace workflows, and billing management.

## Enable Live NVIDIA AI

Set your NVIDIA key as an environment variable before starting the server. Do not put the key in browser JavaScript.

```powershell
$env:NVIDIA_API_KEY="your_rotated_nvidia_api_key"
node server.js
```

You can also copy `.env.example` to `.env.local`, set `NVIDIA_API_KEY`, and start the server. `.env.local` is ignored by git and loaded automatically by `server.js`.

The gateway uses:

- Endpoint: `https://integrate.api.nvidia.com/v1/chat/completions`
- Model: `meta/llama-4-maverick-17b-128e-instruct`
- Route exposed to the website: `/api/nvidia/v1/chat/completions`
- Default timeout: `30000ms`

## Enable Real PayPal Subscriptions

AXIOMFLOW uses real PayPal Subscriptions for paid access. Product pages and live AI requests are blocked until PayPal verifies an active subscription and the server sets an HttpOnly access cookie.

Set these values in `.env.local`:

```powershell
PAYPAL_ENV="sandbox"
PAYPAL_CLIENT_ID="your_paypal_rest_app_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_rest_app_secret"
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id"
SESSION_SECRET="long_random_cookie_signing_secret"
```

Optional existing PayPal subscription plan IDs:

```powershell
PAYPAL_PLAN_STARTER_MONTHLY=""
PAYPAL_PLAN_STARTER_YEARLY=""
PAYPAL_PLAN_PRO_MONTHLY=""
PAYPAL_PLAN_PRO_YEARLY=""
PAYPAL_PLAN_ENTERPRISE_MONTHLY=""
PAYPAL_PLAN_ENTERPRISE_YEARLY=""
```

If plan IDs are omitted, the server creates real PayPal catalog products and recurring billing plans from the website pricing table.

PayPal webhook endpoint:

```text
POST /api/paypal/webhook
```

## Security Notes

- The API key is read only from `NVIDIA_API_KEY` or ignored local env files.
- `.env` and `.env.local` are ignored by git.
- Browser code calls the local gateway, not NVIDIA directly.
- Gateway requests are rate-limited and size-limited.
- The frontend blocks direct calls to `integrate.api.nvidia.com`; all live AI runs through the local gateway.
- PayPal client secrets and webhook IDs are server-only.
- Local paid access events are stored in `.data/billing.json`, which is ignored by git. Vercel uses a signed HttpOnly access cookie and PayPal verification.
- Static pages include CSP headers in markup and the server adds security headers.

## Deploy To GitHub And Vercel

This repo includes `vercel.json` and `api/index.js` so Vercel can run the API as a serverless function. Local development still uses `server.js`.

GitHub:

```powershell
git init
git add .
git commit -m "Prepare AXIOMFLOW for PayPal subscriptions and Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

Vercel:

1. Import the GitHub repository in Vercel.
2. Framework preset: Other.
3. Build command: `npm run check`.
4. Output directory: `.`
5. Add environment variables from `.env.example` in Vercel Project Settings.
6. Register this PayPal webhook URL:

```text
https://YOUR_VERCEL_DOMAIN/api/paypal/webhook
```

For production, set `PAYPAL_ENV=live` and use live PayPal app credentials and live PayPal plan IDs.
