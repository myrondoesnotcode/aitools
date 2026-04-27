# AI Tools — StackAdvisor + PromptPerfect

Two free tools powered by Claude. One Vercel deploy, zero user-facing API keys.

## Tools

**StackAdvisor** (`/`) — Describe your company, get a personalized AI tool stack report with pricing, ROI estimates, and affiliate-ready links.

**PromptPerfect** (`/promptperfect.html`) — Paste any prompt, get it rewritten for Claude, GPT-4o, Gemini, Llama 3, Mistral, and Grok using each model's official prompt engineering guide.

---

## Deploy to Vercel (5 minutes)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "init"
gh repo create aitools --public --push
# or manually create repo on github.com and push
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repo
3. Framework Preset: **Other** (leave default)
4. Click **Deploy** — it will fail on first deploy (no API key yet, that's fine)

### 3. Add your API key

1. In Vercel dashboard → your project → **Settings** → **Environment Variables**
2. Add:
   - Name: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-your-key-here`
   - Environments: Production, Preview, Development ✓
3. **Redeploy**: Deployments tab → three dots on latest → Redeploy

Your site is live. The API key never appears in the browser.

---

## Local development

```bash
npm i -g vercel
cp .env.example .env.local
# Edit .env.local and add your real key

vercel dev
# → http://localhost:3000
```

---

## Rate limiting

The proxy (`api/proxy.js`) limits each IP to **10 requests per hour** by default.

To change it, edit these two lines in `api/proxy.js`:
```js
const RATE_LIMIT = 10;           // requests per window
const WINDOW_MS  = 60 * 60 * 1000; // 1 hour in ms
```

For production at scale, replace the in-memory Map with [Vercel KV](https://vercel.com/docs/storage/vercel-kv) or [Upstash Redis](https://upstash.com) — same API, persists across cold starts.

---

## Affiliate links

In `public/index.html`, find the `AFFILIATE` object and add your links:

```js
const AFFILIATE = {
  'notion':  'https://notion.so/?ref=YOURID',
  'cursor':  'https://cursor.com/?via=YOURID',
  'zapier':  'https://zapier.com/?via=YOURID',
  'linear':  'https://linear.app/?ref=YOURID',
};
```

Tool names are matched case-insensitively against whatever Claude returns. Everything without a match falls back to the direct URL.

---

## Cost estimates

| Action | Tokens | Cost |
|--------|--------|------|
| StackAdvisor report | ~1,400 | ~$0.015 |
| StackAdvisor URL analysis | ~800 | ~$0.008 |
| PromptPerfect (3 models) | ~3,000 | ~$0.035 |
| PromptPerfect (6 models) | ~5,500 | ~$0.065 |

At 1,000 users/month running one report each: **~$15–25/month** in API costs.

---

## Project structure

```
aitools/
├── api/
│   └── proxy.js          # Edge function — holds API key, rate limits
├── public/
│   ├── index.html        # StackAdvisor
│   └── promptperfect.html # PromptPerfect
├── vercel.json           # Routing config
├── .env.example          # Copy to .env.local for dev
├── .gitignore
└── README.md
```
