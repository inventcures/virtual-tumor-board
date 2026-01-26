# Gemini API Cost Tracking

Virtual Tumor Board includes automatic cost tracking for all Gemini API calls with scheduled email reports.

## Features

- **Real-time cost tracking** for all Gemini API calls
- **Token estimation** from text and images
- **Cost breakdown** by category (MARC extraction, evaluation, RAG, imaging)
- **Scheduled email reports** (daily, weekly, monthly)

## Email Reports

Reports are sent to `spiff007@gmail.com` with subject format:
```
***** VTB COST-UPDATE[DAILY | WEEKLY | MONTHLY] FROM YYYY-MM-DD-HH:MM TO YYYY-MM-DD-HH:MM
```

### Schedule (IST - UTC+5:30)
- **Daily**: Every day at 22:00 IST
- **Weekly**: Every Sunday at 22:00 IST  
- **Monthly**: 1st of each month at 22:00 IST

## Environment Variables

```bash
# Required for email sending
RESEND_API_KEY=re_your_resend_api_key

# Required for cron authentication
CRON_SECRET=your_random_secret_here
```

## API Endpoints

### GET /api/cron/cost-report

Auto-detect report type based on current time, or force a specific type:

```bash
# Auto-detect (returns status if not scheduled time)
curl https://your-app.railway.app/api/cron/cost-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Force daily report
curl "https://your-app.railway.app/api/cron/cost-report?type=DAILY" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Preview without sending (dry run)
curl "https://your-app.railway.app/api/cron/cost-report?type=DAILY&dryRun=true" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### POST /api/cron/cost-report

Manual trigger with custom options:

```bash
curl -X POST https://your-app.railway.app/api/cron/cost-report \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"type": "WEEKLY", "dryRun": false}'
```

## Setting Up Cron Jobs

### Option 1: Railway Cron (Recommended)

Add to your `railway.toml` or configure in Railway dashboard:

```toml
# Daily at 16:30 UTC (22:00 IST)
[[cron]]
schedule = "30 16 * * *"
endpoint = "/api/cron/cost-report"

# Note: Railway automatically adds x-cron-secret header
```

Or use Railway's cron service:
1. Go to Railway dashboard → Your project
2. Add a new "Cron" service
3. Set schedule: `30 16 * * *` (daily at 16:30 UTC = 22:00 IST)
4. Set endpoint: `https://your-app.railway.app/api/cron/cost-report`
5. Add header: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: Vercel Cron

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cost-report",
      "schedule": "30 16 * * *"
    }
  ]
}
```

Vercel automatically authenticates cron requests with `x-vercel-cron` header.

### Option 3: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org) (free)
- [EasyCron](https://www.easycron.com)
- GitHub Actions scheduled workflow

Example cron-job.org setup:
1. Create account at cron-job.org
2. Add new cron job:
   - URL: `https://your-app.railway.app/api/cron/cost-report`
   - Schedule: `30 16 * * *`
   - HTTP Method: GET
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 4: GitHub Actions

Create `.github/workflows/cost-report.yml`:

```yaml
name: Send Cost Reports
on:
  schedule:
    # Daily at 16:30 UTC (22:00 IST)
    - cron: '30 16 * * *'
  workflow_dispatch:  # Manual trigger

jobs:
  send-report:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Cost Report
        run: |
          curl -X GET "https://your-app.railway.app/api/cron/cost-report" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Pricing Reference (Gemini 2.0 Flash)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| gemini-2.0-flash | $0.10 | $0.40 |
| gemini-2.0-flash-lite | $0.075 | $0.30 |
| gemini-1.5-pro | $1.25 | $5.00 |

## Cost Categories

| Category | Description |
|----------|-------------|
| `marc_extraction` | Document text extraction and data extraction |
| `marc_evaluation` | Quality evaluation calls |
| `rag_lookup` | Guideline RAG queries |
| `imaging_analysis` | MedGemma imaging analysis |
| `deliberation` | Agent deliberation calls |
| `other` | Miscellaneous API calls |

## Monitoring

View current costs without triggering email:

```bash
# Get cost summary (last 24h)
curl "https://your-app.railway.app/api/cron/cost-report" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response includes:
- Total calls and tokens
- Cost breakdown by category
- Projected daily/monthly costs
- Next scheduled report time
