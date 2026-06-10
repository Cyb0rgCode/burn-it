# 🔥 Burn It — Burnout Risk Tracker

**Reads your patterns — sleep, output, screen time — and warns you the week before you crash. Not after.**

→ **[cyb0rgcode.github.io/burn-it](https://cyb0rgcode.github.io/burn-it/)**

---

## Overview

Burn It is a lightweight, fully offline burnout predictor. It scores 12 daily habits on a weighted 0–100 scale, plots your risk over time, and generates a context-aware action plan — escalating from maintenance tips when you're healthy to an emergency recovery protocol when you're critical.

No account. No server. All data lives in your browser's `localStorage`.

---

## Scoring model

| Factor | Max pts | Penalty starts at |
|---|:---:|---|
| Sleep duration | 16 | < 7.5h avg — max at < 5h |
| Work hours | 15 | > 7h avg — max at > 12h |
| Stress level | 12 | avg > 4/10 + rising trend |
| Screen time | 10 | > 10h avg — max at > 14h |
| Mood | 10 | avg < 7/10 + falling trend |
| Motivation | 10 | avg < 7/10 + falling trend |
| Output quality | 8 | avg < 7/10 + falling trend |
| Evening work | 6 | > 20% of days |
| Exercise | 5 | < 45 min/day avg |
| Social time | 6 | < 2h/day avg — max at 0 |
| Outdoor time | 4 | < 1h/day avg |
| Caffeine | 2 | > 4 cups/day avg |

**Risk bands**

| Score | Band | Meaning |
|---|---|---|
| 0–24 | 🟢 Low | Healthy baseline — protect it |
| 25–49 | 🟡 Moderate | Early warning signs — correct now |
| 50–71 | 🟠 High | Significant depletion — act this week |
| 72–100 | 🔴 Critical | Danger zone — immediate intervention |

Score is computed as a rolling 7-day weighted average so short bad days don't spike you unfairly.

---

## Features

**Log tab**
- Date picker — log or edit any past day, not just today
- hr:min time inputs for sleep, work, screen, social, exercise, outdoor
- Sliders for output, mood, stress, motivation (1–10)
- Caffeine stepper + evening work toggle

**Risk tab**
- Animated SVG burnout gauge (0–100)
- 12-factor penalty breakdown with color-coded bars
- 7-day trajectory forecast (current → projected score + trend direction)
- Context-aware action plan:
  - ✅ Low → maintenance habits (Daily / Weekly badges)
  - 📉 Moderate → top 3 corrective actions
  - ⚠️ High → top 4 targeted interventions
  - 🚨 Critical → emergency recovery protocol, top 5 urgent steps
  - All actions reference your actual averages ("avg 5h sleep") and carry a timeframe badge (Tonight / Today / This week)

**Trends tab**
- Burnout score curve — full history, orange gradient fill, risk-colored data points
- Sleep, Work, Screen & Social — 14-day line chart
- Output, Mood, Stress & Motivation — 14-day line chart

**History tab**
- Full log table, most recent 14 entries
- Per-row delete
- Export all data as a JSON file
- Import JSON (merges by date, newer entry wins)

**Extra**
- WebGL DarkVeil CPPN animated background (orange-red palette)
- Warning banner for critical scores and imminent-danger trajectories
- PWA-ready: add to iPhone home screen, respects Dynamic Island / notch / home-indicator safe areas
- Fully offline — no network requests after initial page load

---

## Stack

| Layer | Tech |
|---|---|
| Language | Vanilla HTML / CSS / JavaScript — zero build step |
| Charts | [Chart.js 4.4](https://www.chartjs.org/) |
| Background | WebGL 1.0 CPPN shader (ported from [React Bits DarkVeil](https://www.reactbits.dev/)) |
| Storage | `localStorage` (`burnit_v1` key) |
| Hosting | GitHub Pages (auto-deploys on push to `main`) |

---

## Run locally

```bash
# Option 1 — static server (recommended, avoids CORS quirks)
npx serve .
# → http://localhost:3000

# Option 2 — just open directly
open index.html
```

---

## Data & privacy

All data is stored in `localStorage` under the key `burnit_v1` as a JSON array of daily entries. Nothing is ever sent to a server. Use Export on the History tab to back up your data as a `.json` file; use Import to restore it.

---

## License

MIT
