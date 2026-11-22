<p align="center" style="font-size: 60px;">
  ⛅
</p>

<h1 align="center">sPARK Forecasting</h1>

<p align="center"><strong>How Flint's predictions get to the app.</strong></p>

## 🔄 How It Works

```text
Supabase scheduler -> Next.js /api/cron/forecast
                      ├── Private Flint service -> forecasts
                      └── Three-week average    -> mean_last_3_weeks_forecasts

sPARK app -> reads saved predictions from forecasts
```

[Flint v0.3 beta](../../../../../../lab/models/flint_v0.3/README.md) forecasts open half-hour slots for the rest of today and the next six Pacific calendar days. I save the three-week average separately so I can compare it with Flint against actual readings.

## 🚀 Going Live

1. **Vercel:** Deploy Next.js and Flint together using Vercel Services. Keep `web-app` as the project root, enable **Include source files outside of the Root Directory**, and set `FORECASTING_API_KEY` and `INTERNAL_API_KEY`.
2. **Supabase:** Apply the [forecast migration](../../../../../../supabase/migrations/20261114000755_flint_forecast_comparison.sql) and verify a run writes to both tables.
3. **Scheduler:** Point the existing `trigger-forecast` job at `POST /api/cron/forecast`. Send the forecast key as `Authorization: Bearer <key>` and the internal key as `X-API-Key: Bearer <key>`. Allow at least 30 seconds and record the first successful Flint run in UTC.

## ⚙️ Run It Yourself

Use Python 3.13 and set both keys in `web-app/.env`. From `web-app/`, run the following.

```sh
python flint/package-flint.py
npx vercel dev --local
```
