# 🔥 Burn It — Burnout Predictor

> Track your daily habits and get a real-time burnout risk score before it's too late.

**Live app → [cyb0rgcode.github.io/burn-it](https://cyb0rgcode.github.io/burn-it/)**

---

## What it does

Burn It scores your daily habits across 12 factors and predicts your burnout risk on a 0–100 scale. Log takes ~30 seconds. Data never leaves your device.

**Risk factors tracked:**
| Factor | Weight |
|---|---|
| Sleep duration | 16 pts |
| Work hours | 15 pts |
| Stress level | 12 pts |
| Screen time | 10 pts |
| Mood | 10 pts |
| Motivation | 10 pts |
| Output quality | 8 pts |
| Evening work | 6 pts |
| Exercise | 5 pts |
| Outdoor time | 4 pts |
| Social time | 3 pts |
| Caffeine intake | 1 pt |

**Risk bands:** Low · Moderate · High · Critical

---

## Features

- **Daily log** — time inputs, sliders, toggles; takes 30s
- **Burnout gauge** — weighted score with risk breakdown tiles
- **7-day forecast** — projects trajectory based on recent trend
- **Contextual tips** — top 3 priorities ranked by penalty score
- **Daily habits** — 8 science-backed recovery habits
- **Trends charts** — 14-day history for all 8 metrics (Chart.js)
- **Log history** — full table with per-day delete
- **WebGL background** — DarkVeil CPPN shader, orange-red theme
- **PWA-ready** — works as iPhone home screen app, safe areas, no zoom
- **Fully offline** — no server, no account, localStorage only

---

## Stack

- Vanilla HTML / CSS / JavaScript — zero build step
- [Chart.js 4.4](https://www.chartjs.org/) — trend charts
- WebGL 1.0 — animated DarkVeil background (ported from [React Bits](https://www.reactbits.dev/))
- localStorage — all data persisted locally

---

## Run locally

```bash
npx serve .
# → http://localhost:3000
```

Or just open `index.html` directly in a browser.

---

## Deploy

Hosted on GitHub Pages — any push to `main` updates the live site automatically.

---

## License

MIT
