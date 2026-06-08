'use strict';

const STORAGE_KEY = 'burnit_v1';

// ── Storage ──────────────────────────────────────────────

function getEntries() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveEntry(entry) {
  const entries = getEntries();
  const idx = entries.findIndex(e => e.date === entry.date);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  entries.sort((a, b) => a.date.localeCompare(b.date));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function deleteEntry(date) {
  const entries = getEntries().filter(e => e.date !== date);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Date helpers ─────────────────────────────────────────

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function localDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtTime(dec) {
  const h = Math.floor(dec);
  const m = Math.round((dec - h) * 60);
  if (m === 0) return `${h}h`;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function toDecimal(hrId, minId) {
  const h = parseInt(document.getElementById(hrId).value) || 0;
  const m = parseInt(document.getElementById(minId).value) || 0;
  return h + m / 60;
}

function fromDecimal(dec, hrId, minId) {
  document.getElementById(hrId).value  = Math.floor(dec);
  document.getElementById(minId).value = Math.round((dec % 1) * 60);
}

// ── Math ─────────────────────────────────────────────────

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function linearSlope(arr) {
  const n = arr.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = avg(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (arr[i] - yMean);
    den += (i - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// ── Burnout engine ───────────────────────────────────────
// Weights: sleep 16 + work 15 + stress 12 + screen 10 + mood 10 + motivation 10
//          + output 8 + eveningWork 6 + exercise 5 + outdoor 4 + social 3 + caffeine 1 = 100

function calcBurnoutScore(entries) {
  if (entries.length < 3) return null;
  const recent = entries.slice(-7);

  // Sleep (0–16)
  const avgSleep = avg(recent.map(e => e.sleep));
  let sleepP = 0;
  if      (avgSleep < 5)   sleepP = 16;
  else if (avgSleep < 6)   sleepP = 13;
  else if (avgSleep < 6.5) sleepP = 9;
  else if (avgSleep < 7)   sleepP = 6;
  else if (avgSleep < 7.5) sleepP = 2;

  // Work hours (0–15) — optional
  const wkVals  = recent.filter(e => e.work != null).map(e => e.work);
  const avgWork = wkVals.length > 0 ? avg(wkVals) : null;
  let workP = 0;
  if (avgWork != null) {
    if      (avgWork > 10) workP = 15;
    else if (avgWork > 9)  workP = 12;
    else if (avgWork > 8)  workP = 8;
    else if (avgWork > 7)  workP = 4;
    else if (avgWork > 6)  workP = 1;
  }

  // Stress (0–12) — optional, level + trend
  const stVals     = recent.filter(e => e.stress != null).map(e => e.stress);
  const avgStress  = stVals.length > 0 ? avg(stVals) : null;
  const stressSlope = stVals.length > 1 ? linearSlope(stVals) : 0;
  let stressP = 0;
  if (avgStress != null) {
    if      (avgStress > 8) stressP += 8;
    else if (avgStress > 6) stressP += 5;
    else if (avgStress > 4) stressP += 2;
    if      (stressSlope > 0.5) stressP += 4;
    else if (stressSlope > 0.1) stressP += 2;
    stressP = Math.min(12, stressP);
  }

  // Screen time (0–10)
  const avgScreen = avg(recent.map(e => e.screenTime));
  let screenP = 0;
  if      (avgScreen > 14) screenP = 10;
  else if (avgScreen > 12) screenP = 8;
  else if (avgScreen > 10) screenP = 5;
  else if (avgScreen > 9)  screenP = 2;
  else if (avgScreen > 8)  screenP = 1;

  // Mood (0–10) — level + trend
  const avgMood   = avg(recent.map(e => e.mood));
  const moodSlope = linearSlope(recent.map(e => e.mood));
  let moodP = 0;
  if      (avgMood < 3) moodP += 7;
  else if (avgMood < 5) moodP += 5;
  else if (avgMood < 7) moodP += 2;
  if      (moodSlope < -1.0)  moodP += 3;
  else if (moodSlope < -0.5)  moodP += 2;
  else if (moodSlope < -0.15) moodP += 1;
  moodP = Math.min(10, Math.max(0, moodP));

  // Motivation (0–10) — optional, level + trend
  const moVals        = recent.filter(e => e.motivation != null).map(e => e.motivation);
  const avgMotivation = moVals.length > 0 ? avg(moVals) : null;
  const motivSlope    = moVals.length > 1 ? linearSlope(moVals) : 0;
  let motivP = 0;
  if (avgMotivation != null) {
    if      (avgMotivation < 3) motivP += 7;
    else if (avgMotivation < 5) motivP += 5;
    else if (avgMotivation < 7) motivP += 2;
    if      (motivSlope < -1.0)  motivP += 3;
    else if (motivSlope < -0.5)  motivP += 2;
    else if (motivSlope < -0.15) motivP += 1;
    motivP = Math.min(10, Math.max(0, motivP));
  }

  // Output (0–8) — level + trend
  const avgOutput   = avg(recent.map(e => e.output));
  const outputSlope = linearSlope(recent.map(e => e.output));
  let outputP = 0;
  if      (avgOutput < 3) outputP += 5;
  else if (avgOutput < 5) outputP += 3;
  else if (avgOutput < 7) outputP += 1;
  if      (outputSlope < -1.0)  outputP += 3;
  else if (outputSlope < -0.5)  outputP += 2;
  else if (outputSlope < -0.15) outputP += 1;
  outputP = Math.min(8, Math.max(0, outputP));

  // Evening work (0–6) — optional
  const ewEntries = recent.filter(e => e.eveningWork != null);
  let eveningP = 0;
  let ewRate   = null;
  if (ewEntries.length > 0) {
    ewRate = ewEntries.filter(e => e.eveningWork).length / ewEntries.length;
    if      (ewRate > 0.8) eveningP = 6;
    else if (ewRate > 0.5) eveningP = 4;
    else if (ewRate > 0.2) eveningP = 2;
    else if (ewRate > 0)   eveningP = 1;
  }

  // Exercise (0–5) — optional
  const exVals      = recent.filter(e => e.exercise != null).map(e => e.exercise);
  const avgExercise = exVals.length > 0 ? avg(exVals) : null;
  let exerciseP = 0;
  if (avgExercise != null) {
    if      (avgExercise === 0)  exerciseP = 5;
    else if (avgExercise < 0.25) exerciseP = 4;
    else if (avgExercise < 0.5)  exerciseP = 2;
    else if (avgExercise < 0.75) exerciseP = 1;
  }

  // Outdoor / leisure (0–4) — optional
  const outVals    = recent.filter(e => e.outdoor != null).map(e => e.outdoor);
  const avgOutdoor = outVals.length > 0 ? avg(outVals) : null;
  let outdoorP = 0;
  if (avgOutdoor != null) {
    if      (avgOutdoor === 0)  outdoorP = 4;
    else if (avgOutdoor < 0.5)  outdoorP = 2;
    else if (avgOutdoor < 1)    outdoorP = 1;
  }

  // Social (0–3) — optional
  const soVals    = recent.filter(e => e.social != null).map(e => e.social);
  const avgSocial = soVals.length > 0 ? avg(soVals) : null;
  let socialP = 0;
  if (avgSocial != null) {
    if      (avgSocial === 0)  socialP = 3;
    else if (avgSocial < 0.5)  socialP = 2;
    else if (avgSocial < 1)    socialP = 1;
  }

  // Caffeine (0–1) — optional
  const caVals      = recent.filter(e => e.caffeine != null).map(e => e.caffeine);
  const avgCaffeine = caVals.length > 0 ? avg(caVals) : null;
  let caffeineP = 0;
  if (avgCaffeine != null && avgCaffeine > 8) caffeineP = 1;

  const total = Math.min(
    sleepP + workP + stressP + screenP + moodP + motivP +
    outputP + eveningP + exerciseP + outdoorP + socialP + caffeineP,
    100
  );

  return {
    total,
    sleepP, workP, stressP, screenP, moodP, motivP,
    outputP, eveningP, exerciseP, outdoorP, socialP, caffeineP,
    avgSleep, avgWork, avgStress, avgScreen, avgMood, avgMotivation,
    avgOutput, avgExercise, avgOutdoor, avgSocial, avgCaffeine,
    moodSlope, outputSlope, stressSlope, motivSlope, ewRate,
  };
}

function projectScore(entries) {
  if (entries.length < 5) return null;

  const scores = [];
  for (let i = 3; i <= entries.length; i++) {
    const s = calcBurnoutScore(entries.slice(0, i));
    if (s) scores.push(s.total);
  }
  if (scores.length < 3) return null;

  const slope      = linearSlope(scores);
  const current    = scores[scores.length - 1];
  const projected7 = Math.max(0, Math.min(100, current + slope * 7));

  const DANGER = 72;
  let daysUntilDanger = null;
  if (current < DANGER && slope > 0) {
    const d = Math.ceil((DANGER - current) / slope);
    if (d <= 30) daysUntilDanger = d;
  }

  return { current, projected7, slope, daysUntilDanger };
}

// ── Risk label ───────────────────────────────────────────

function riskInfo(score) {
  if (score < 25) return { label: 'LOW',      color: '#22c55e' };
  if (score < 50) return { label: 'MODERATE', color: '#f59e0b' };
  if (score < 72) return { label: 'HIGH',     color: '#f97316' };
  return               { label: 'CRITICAL',  color: '#ef4444' };
}

// ── SVG Gauge ────────────────────────────────────────────

function renderGauge(score) {
  const sw = 14, cx = 100, cy = 116, r = 92;
  const risk = riskInfo(score);

  const bgD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  let progEl = '';

  if (score > 1) {
    const angle = Math.PI * (1 - score / 100);
    const px = (cx + r * Math.cos(angle)).toFixed(2);
    const py = (cy - r * Math.sin(angle)).toFixed(2);
    progEl = `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${px} ${py}" fill="none" stroke="${risk.color}" stroke-width="${sw}" stroke-linecap="round"/>`;
  }

  document.getElementById('gaugeContainer').innerHTML = `
    <svg viewBox="0 0 200 100" width="220" height="110" style="display:block">
      <defs>
        <clipPath id="gc">
          <rect x="-10" y="-10" width="220" height="103"/>
        </clipPath>
      </defs>
      <g clip-path="url(#gc)">
        <path d="${bgD}" fill="none" stroke="${isLight() ? '#ddd8d0' : '#26262f'}" stroke-width="${sw}" stroke-linecap="round"/>
        ${progEl}
      </g>
      <text x="100" y="70" text-anchor="middle" fill="${risk.color}" font-size="30" font-weight="800" font-family="Inter,system-ui,sans-serif">${score}</text>
      <text x="100" y="87" text-anchor="middle" fill="${risk.color}" font-size="10" font-weight="700" font-family="Inter,system-ui,sans-serif" letter-spacing="2">${risk.label} RISK</text>
    </svg>
  `;
}

// ── Breakdown bars ───────────────────────────────────────

function breakdownColor(val, max) {
  const pct = val / max;
  if (pct > 0.72) return '#ef4444';
  if (pct > 0.48) return '#f97316';
  if (pct > 0.24) return '#f59e0b';
  return '#22c55e';
}

function renderBreakdown(s) {
  const items = [
    { label: '😴 Sleep',       value: s.sleepP,    max: 16, detail: `avg ${fmtTime(s.avgSleep)}` },
    { label: '💼 Work',        value: s.workP,     max: 15, detail: s.avgWork        != null ? `avg ${fmtTime(s.avgWork)}` : 'no data' },
    { label: '😤 Stress',      value: s.stressP,   max: 12, detail: s.avgStress      != null ? `avg ${s.avgStress.toFixed(1)}/10` : 'no data' },
    { label: '💻 Screen',      value: s.screenP,   max: 10, detail: `avg ${fmtTime(s.avgScreen)}` },
    { label: '😊 Mood',        value: s.moodP,     max: 10, detail: `avg ${s.avgMood.toFixed(1)}/10` },
    { label: '🎯 Motivation',  value: s.motivP,    max: 10, detail: s.avgMotivation  != null ? `avg ${s.avgMotivation.toFixed(1)}/10` : 'no data' },
    { label: '📊 Output',      value: s.outputP,   max: 8,  detail: `avg ${s.avgOutput.toFixed(1)}/10` },
    { label: '🌙 Eve. Work',   value: s.eveningP,  max: 6,  detail: s.ewRate         != null ? `${Math.round(s.ewRate * 100)}% of days` : 'no data' },
    { label: '🏃 Exercise',    value: s.exerciseP, max: 5,  detail: s.avgExercise    != null ? `avg ${fmtTime(s.avgExercise)}` : 'no data' },
    { label: '🌿 Outdoor',     value: s.outdoorP,  max: 4,  detail: s.avgOutdoor     != null ? `avg ${fmtTime(s.avgOutdoor)}` : 'no data' },
    { label: '👥 Social',      value: s.socialP,   max: 3,  detail: s.avgSocial      != null ? `avg ${fmtTime(s.avgSocial)}` : 'no data' },
    { label: '☕ Caffeine',    value: s.caffeineP, max: 1,  detail: s.avgCaffeine    != null ? `avg ${s.avgCaffeine.toFixed(1)} cups` : 'no data' },
  ];

  return `
    <div class="section-title">Risk Breakdown</div>
    ${items.map(item => `
      <div class="breakdown-item">
        <div class="breakdown-header">
          <span class="breakdown-label">${item.label}</span>
          <span class="breakdown-detail">${item.detail}</span>
          <span class="breakdown-score">${item.value}/${item.max}</span>
        </div>
        <div class="breakdown-bar">
          <div class="breakdown-fill" style="width:${(item.value / item.max) * 100}%; background:${breakdownColor(item.value, item.max)}"></div>
        </div>
      </div>
    `).join('')}
  `;
}

// ── Charts ───────────────────────────────────────────────

let timeChart = null;
let wellChart = null;
let burnChart = null;

// ── Form helpers ─────────────────────────────────────────

function populateFormFromEntry(entry) {
  fromDecimal(entry.sleep,           'sleepHr',    'sleepMin');
  fromDecimal(entry.work    ?? 0,    'workHr',     'workMin');
  fromDecimal(entry.screenTime,      'screenHr',   'screenMin');
  fromDecimal(entry.social  ?? 0,    'socialHr',   'socialMin');
  fromDecimal(entry.exercise ?? 0,   'exerciseHr', 'exerciseMin');
  fromDecimal(entry.outdoor ?? 0,    'outdoorHr',  'outdoorMin');
  document.getElementById('caffeineInput').value           = entry.caffeine   ?? 0;
  document.getElementById('caffeineDisplay').textContent   = entry.caffeine   ?? 0;
  document.getElementById('outputInput').value             = entry.output;
  document.getElementById('moodInput').value               = entry.mood;
  document.getElementById('outputDisplay').textContent     = entry.output;
  document.getElementById('moodDisplay').textContent       = entry.mood;
  const si = entry.stress     ?? 5;
  const mi = entry.motivation ?? 5;
  document.getElementById('stressInput').value             = si;
  document.getElementById('motivationInput').value         = mi;
  document.getElementById('stressDisplay').textContent     = si;
  document.getElementById('motivationDisplay').textContent = mi;
  const ew = entry.eveningWork ?? false;
  document.getElementById('eveningWorkInput').checked      = ew;
  document.getElementById('eveningWorkLabel').textContent  = ew ? 'Yes' : 'No';
  document.getElementById('eveningWorkLabel').style.color  = ew ? 'var(--orange)' : '';
}

function clearFormFields() {
  ['sleepHr','sleepMin','workHr','workMin','screenHr','screenMin',
   'socialHr','socialMin','exerciseHr','exerciseMin','outdoorHr','outdoorMin'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('caffeineInput').value           = 0;
  document.getElementById('caffeineDisplay').textContent   = 0;
  document.getElementById('outputInput').value             = 5;
  document.getElementById('moodInput').value               = 5;
  document.getElementById('stressInput').value             = 5;
  document.getElementById('motivationInput').value         = 5;
  document.getElementById('outputDisplay').textContent     = 5;
  document.getElementById('moodDisplay').textContent       = 5;
  document.getElementById('stressDisplay').textContent     = 5;
  document.getElementById('motivationDisplay').textContent = 5;
  document.getElementById('eveningWorkInput').checked      = false;
  document.getElementById('eveningWorkLabel').textContent  = 'No';
  document.getElementById('eveningWorkLabel').style.color  = '';
}

function syncFormState(entries) {
  const logDateEl = document.getElementById('logDate');
  if (!logDateEl) return;
  const dateStr   = logDateEl.value || today();
  const entry     = entries.find(e => e.date === dateStr);
  const logBtn    = document.getElementById('logBtn');
  const logStatus = document.getElementById('logStatus');
  const isToday   = dateStr === today();
  const label     = isToday ? 'Today' : formatDate(dateStr);

  if (entry) {
    logBtn.textContent    = `Update ${label}`;
    logStatus.textContent = `✓ Already logged ${isToday ? 'today' : label}`;
    logStatus.style.color = '#22c55e';
    populateFormFromEntry(entry);
  } else {
    logBtn.textContent    = `Log ${label}`;
    logStatus.textContent = '';
  }
}

// ── Burnout history chart ─────────────────────────────────

function renderBurnoutChart(entries) {
  const section = document.getElementById('burnoutChartSection');
  if (!section) return;
  if (entries.length < 3) { section.style.display = 'none'; return; }

  const labels = [];
  const scores = [];
  for (let i = 2; i < entries.length; i++) {
    const s = calcBurnoutScore(entries.slice(0, i + 1));
    if (s !== null) {
      labels.push(formatDate(entries[i].date));
      scores.push(Math.round(s.total));
    }
  }
  if (scores.length === 0) { section.style.display = 'none'; return; }
  section.style.display = 'block';

  const ctx = document.getElementById('burnoutChart').getContext('2d');
  if (burnChart) burnChart.destroy();

  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(249,115,22,0.28)');
  grad.addColorStop(1, 'rgba(249,115,22,0)');

  burnChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Burnout Score',
        data: scores,
        borderColor: '#f97316',
        backgroundColor: grad,
        tension: 0.4,
        pointRadius: 3,
        fill: true,
        pointBackgroundColor: scores.map(v => riskInfo(v).color),
        pointBorderColor:     scores.map(v => riskInfo(v).color),
      }],
    },
    options: (() => {
      const o = chartOpts(100);
      o.plugins.tooltip.callbacks = { label: ctx => `Score: ${ctx.parsed.y} — ${riskInfo(ctx.parsed.y).label} RISK` };
      o.scales.y.ticks = { ...o.scales.y.ticks, stepSize: 25 };
      return o;
    })(),
  });
}

function isLight() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

const chartOpts = (yMax) => {
  const lt = isLight();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: lt ? '#8b7d73' : '#6b7280', font: { family: 'Inter,system-ui,sans-serif', size: 12 }, boxWidth: 12, padding: 14 } },
      tooltip: {
        backgroundColor: lt ? '#fffdfb' : '#1c1c22',
        borderColor:     lt ? '#ddd8d0' : '#26262f',
        borderWidth: 1,
        titleColor:  lt ? '#1c1714' : '#e5e5e7',
        bodyColor:   lt ? '#8b7d73' : '#9ca3af',
      },
    },
    scales: {
      x: { grid: { color: lt ? '#e8e2da' : '#1e1e26' }, ticks: { color: lt ? '#a89890' : '#4b5563', font: { size: 11 } } },
      y: { grid: { color: lt ? '#e8e2da' : '#1e1e26' }, ticks: { color: lt ? '#a89890' : '#4b5563', font: { size: 11 } }, min: 0, max: yMax },
    },
  };
};

function renderCharts(entries) {
  const recent = entries.slice(-14);
  const labels = recent.map(e => formatDate(e.date));

  // Chart 1: time-based (hours) — sleep, work, screen, social
  const ctx1 = document.getElementById('trendChart').getContext('2d');
  if (timeChart) timeChart.destroy();
  timeChart = new Chart(ctx1, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Sleep (h)',  data: recent.map(e => e.sleep),                      borderColor: '#818cf8', backgroundColor: 'rgba(129,140,248,0.08)', tension: 0.4, pointRadius: 3 },
        { label: 'Work (h)',   data: recent.map(e => e.work ?? null),               borderColor: '#f97316', backgroundColor: 'rgba(249,115,22,0.08)',   tension: 0.4, pointRadius: 3, spanGaps: false },
        { label: 'Screen (h)', data: recent.map(e => e.screenTime),                 borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',    tension: 0.4, pointRadius: 3 },
        { label: 'Social (h)', data: recent.map(e => e.social ?? null),             borderColor: '#2dd4bf', backgroundColor: 'rgba(45,212,191,0.08)',   tension: 0.4, pointRadius: 3, spanGaps: false },
      ],
    },
    options: chartOpts(16),
  });

  // Chart 2: wellbeing — output, mood, stress, motivation (all 1–10)
  const ctx2 = document.getElementById('healthChart').getContext('2d');
  if (wellChart) wellChart.destroy();
  wellChart = new Chart(ctx2, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Output /10',     data: recent.map(e => e.output),                  borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)',   tension: 0.4, pointRadius: 3 },
        { label: 'Mood /10',       data: recent.map(e => e.mood),                    borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.08)', tension: 0.4, pointRadius: 3 },
        { label: 'Stress /10',     data: recent.map(e => e.stress ?? null),          borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)',   tension: 0.4, pointRadius: 3, spanGaps: false },
        { label: 'Motivation /10', data: recent.map(e => e.motivation ?? null),      borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.08)',  tension: 0.4, pointRadius: 3, spanGaps: false },
      ],
    },
    options: chartOpts(10),
  });
}

// ── Render history table ─────────────────────────────────

function scoreDot(val) {
  const cls = val >= 7 ? 'green' : val >= 4 ? 'yellow' : 'red';
  return `<span class="dot ${cls}"></span>`;
}

function stressDot(val) {
  const cls = val <= 3 ? 'green' : val <= 6 ? 'yellow' : 'red';
  return `<span class="dot ${cls}"></span>`;
}

function renderHistory(entries) {
  const tbody = document.getElementById('historyBody');
  const t = today();

  tbody.innerHTML = [...entries].reverse().slice(0, 14).map(e => `
    <tr${e.date === t ? ' class="today-row"' : ''}>
      <td>${formatDate(e.date)}${e.date === t ? '<span class="today-badge">today</span>' : ''}</td>
      <td>${fmtTime(e.sleep)}</td>
      <td>${e.work      != null ? fmtTime(e.work) : '—'}</td>
      <td>${fmtTime(e.screenTime)}</td>
      <td>${e.social    != null ? fmtTime(e.social) : '—'}</td>
      <td>${e.exercise  != null ? fmtTime(e.exercise) : '—'}</td>
      <td>${e.outdoor   != null ? fmtTime(e.outdoor) : '—'}</td>
      <td>${e.caffeine  != null ? e.caffeine + '☕' : '—'}</td>
      <td>${scoreDot(e.output)} ${e.output}/10</td>
      <td>${scoreDot(e.mood)} ${e.mood}/10</td>
      <td>${e.stress     != null ? stressDot(e.stress) + ' ' + e.stress + '/10' : '—'}</td>
      <td>${e.motivation != null ? scoreDot(e.motivation) + ' ' + e.motivation + '/10' : '—'}</td>
      <td>${e.eveningWork != null ? (e.eveningWork ? '<span style="color:var(--orange)">Yes</span>' : '<span style="color:var(--muted)">No</span>') : '—'}</td>
      <td><button class="delete-btn" data-date="${e.date}" title="Delete entry">×</button></td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => { deleteEntry(btn.dataset.date); render(); });
  });
}

// ── Action plan ──────────────────────────────────────────

function tfBadge(tf) {
  const map = { 'Now':'#ef4444','Today':'#ef4444','Tonight':'#818cf8','This week':'#f59e0b','Daily':'#22c55e','Weekly':'#22c55e' };
  const c = map[tf] || '#6b7280';
  return `<div class="action-timeframe" style="color:${c};border-color:${c}20;background:${c}12">${tf}</div>`;
}

function actionItem(tf, icon, title, desc) {
  return `<div class="action-item">${tfBadge(tf)}<div class="action-body"><span class="action-title">${icon} ${title}</span><span class="action-desc">${desc}</span></div></div>`;
}

function buildActionPlanHTML(s, score, risk) {
  if (score < 25) {
    const items = [
      ['Daily',  '😴', 'Keep your sleep schedule consistent',   'Same wake time every day — including weekends — is the #1 drift prevention'],
      ['Daily',  '🏃', 'Maintain your current movement habit',  'Exercise is the most protective factor against future score increases'],
      ['Weekly', '💼', 'Watch for work-hour creep',             'Burnout sneaks in through gradual overload — log daily to catch early drift'],
      ['Weekly', '📅', 'Protect one full rest day per week',    'Non-negotiable recovery prevents the score from climbing back up'],
    ];
    return `
      <div class="card-title" style="color:${risk.color}">✅ You're in the Green — Keep It There</div>
      <div class="action-subtitle">Score ${score}/100. Protect what's working.</div>
      <div class="action-list">${items.map(([tf,ic,t,d]) => actionItem(tf,ic,t,d)).join('')}</div>
    `;
  }

  const {
    sleepP, workP, stressP, screenP, moodP, motivP,
    outputP, eveningP, exerciseP, outdoorP, socialP,
    avgSleep, avgWork, avgStress, avgScreen, avgMood, avgMotivation, avgOutput, ewRate,
  } = s;

  const A = [];
  const add = (w, tf, icon, t, d) => A.push({ w, tf, icon, t, d });

  if      (sleepP >= 13) add(sleepP,    'Tonight',   '😴', 'Sleep at least 8h tonight',                  `avg ${fmtTime(avgSleep)} — every extra hour cuts score ~5pts`);
  else if (sleepP >= 9)  add(sleepP,    'Tonight',   '😴', 'Set bedtime 1h earlier — alarm set',          `avg ${fmtTime(avgSleep)} — hit 7.5h minimum`);
  else if (sleepP >= 6)  add(sleepP,    'This week', '😴', 'Push bedtime 30 min earlier',                 `avg ${fmtTime(avgSleep)} — small change, big returns`);
  else if (sleepP >= 2)  add(sleepP,    'This week', '😴', 'Lock in a consistent wake time',              'Regularity matters more than total hours');

  if      (workP >= 12)  add(workP,     'Today',     '💼', 'Hard stop at 6pm — close everything',         `avg ${fmtTime(avgWork)} work/day is the primary driver`);
  else if (workP >= 8)   add(workP,     'This week', '💼', 'Cap at 8h and block one easy day',            `avg ${fmtTime(avgWork)} — one lighter day resets capacity`);
  else if (workP >= 4)   add(workP,     'This week', '💼', 'Leave one task unfinished on purpose today',  'Trains the brain to stop — reduces perfectionism load');

  if      (stressP >= 8) add(stressP,   'Today',     '😤', '20 min decompression — mandatory',            `avg stress ${avgStress?.toFixed(1)}/10 — walk, breathe, or journal`);
  else if (stressP >= 5) add(stressP,   'Today',     '😤', 'Write down your #1 stressor + one action',    `avg stress ${avgStress?.toFixed(1)}/10 — externalizing it shrinks it`);
  else if (stressP >= 2) add(stressP,   'This week', '😤', 'Add one daily decompression ritual',          '10 min of calm per day — consistency beats duration');

  if      (screenP >= 8) add(screenP,   'Tonight',   '💻', 'No screens from dinner until bed',            `avg ${fmtTime(avgScreen)} screen time — cutoff improves sleep depth`);
  else if (screenP >= 5) add(screenP,   'This week', '💻', 'Screen-free meals + 30 min offline before bed', `avg ${fmtTime(avgScreen)} — two rules that measurably lower score`);
  else if (screenP >= 2) add(screenP,   'This week', '💻', 'Use the 20-20-20 rule at your desk',          'Every 20 min: look 20ft away for 20s — reduces cognitive load');

  if      (moodP >= 7)   add(moodP,     'Today',     '😊', 'Reach out to one person — right now',         `avg mood ${avgMood?.toFixed(1)}/10 — social connection is fastest reset`);
  else if (moodP >= 5)   add(moodP,     'Today',     '😊', 'Close one small task and acknowledge it',     `avg mood ${avgMood?.toFixed(1)}/10 — small wins rebuild momentum`);
  else if (moodP >= 2)   add(moodP,     'This week', '😊', 'Add 10 min outdoors between tasks',           'Light + movement are the cheapest mood lifts available');

  if      (motivP >= 7)  add(motivP,    'Today',     '🎯', 'Work in 25-min sprints — one task only',      `avg motivation ${avgMotivation?.toFixed(1)}/10 — starting is the hard part`);
  else if (motivP >= 5)  add(motivP,    'Today',     '🎯', 'Write down one reason you care about your work', 'Reconnecting with purpose is the fastest motivation reset');
  else if (motivP >= 2)  add(motivP,    'This week', '🎯', 'Prepare your first task the night before',    'Reduces friction — motivation follows action, not the reverse');

  if      (outputP >= 5) add(outputP,   'Today',     '📊', 'Take a real break — no phone scrolling',      `avg output ${avgOutput?.toFixed(1)}/10 — cognitive fatigue needs genuine rest`);
  else if (outputP >= 3) add(outputP,   'This week', '📊', 'Single-task with all notifications off',      'Close every unrelated tab — focus is a replenishable resource');

  if      (eveningP >= 6) add(eveningP, 'Tonight',   '🌙', 'No work after 8pm — protect 3 evenings this week', `Evening work ${ewRate != null ? Math.round(ewRate * 100) : 0}% of days — wind-down time is not optional`);
  else if (eveningP >= 4) add(eveningP, 'Tonight',   '🌙', 'Create a shutdown ritual at a fixed time',    'Signals your brain the day is over — directly improves sleep depth');
  else if (eveningP >= 2) add(eveningP, 'This week', '🌙', 'Add a 20-min calm routine before bed',        'Consistent wind-down pays off in sleep quality within 2–3 days');

  if      (exerciseP >= 5) add(exerciseP,'Today',    '🏃', '20-min walk — right now or after work',       'No exercise logged — movement lowers cortisol faster than anything');
  else if (exerciseP >= 4) add(exerciseP,'Today',    '🏃', 'Walk 15 min at any point today',              'Minimal threshold — gets the habit re-started');
  else if (exerciseP >= 2) add(exerciseP,'This week','🏃', 'Aim for 30 min movement 3× this week',        'Exercise is a direct score reducer — each session counts');

  if      (outdoorP >= 4) add(outdoorP, 'Today',     '🌿', 'Step outside for at least 10 min',            'No outdoor time — natural light resets cortisol and circadian rhythm');
  else if (outdoorP >= 2) add(outdoorP, 'This week', '🌿', 'Eat one meal outside this week',              'Lowest-friction way to add outdoor time to a packed schedule');

  if      (socialP >= 3) add(socialP,   'Today',     '👥', 'Text or call one person — 10 min minimum',   'Isolation amplifies every other risk factor — connection is protective');
  else if (socialP >= 2) add(socialP,   'This week', '👥', 'Schedule one social touchpoint this week',    'Even brief contact buffers against burnout progression');

  const limit = score >= 72 ? 5 : score >= 50 ? 4 : 3;
  const top   = A.sort((a, b) => b.w - a.w).slice(0, limit);

  const planTitle = score >= 72 ? '🚨 Emergency Recovery Plan'
                  : score >= 50 ? '⚠️ Correction Needed'
                  : '📉 Reduce Your Score';
  const subtitle  = score >= 72 ? `Score ${score}/100 — take these steps immediately.`
                                 : `Score ${score}/100 — act on these in order.`;

  return `
    <div class="card-title" style="color:${risk.color}">${planTitle}</div>
    <div class="action-subtitle">${subtitle}</div>
    <div class="action-list">${top.map(a => actionItem(a.tf, a.icon, a.t, a.d)).join('')}</div>
  `;
}

function renderTips(scoreData) {
  const sec = document.getElementById('tipsSection');
  if (!scoreData) { sec.style.display = 'none'; return; }

  const score = Math.round(scoreData.total);
  const risk  = riskInfo(score);
  sec.style.display = 'block';
  sec.innerHTML     = buildActionPlanHTML(scoreData, score, risk);
}

// ── Warning banner ───────────────────────────────────────

function renderWarning(scoreData, projection) {
  const banner = document.getElementById('warningBanner');
  banner.className = 'warning-banner';

  if (!scoreData) { banner.style.display = 'none'; return; }

  const score = Math.round(scoreData.total);

  if (score >= 72) {
    banner.style.display = 'flex';
    banner.innerHTML = `<span class="warning-icon">🚨</span><span>You're in the <strong>danger zone</strong>. Your body is signaling distress. Rest now.</span>`;
    return;
  }

  if (projection?.daysUntilDanger !== null && projection.daysUntilDanger <= 7) {
    banner.style.display = 'flex';
    banner.innerHTML = `<span class="warning-icon">⚠️</span><span>At this pace, burnout hits in <strong>${projection.daysUntilDanger} day${projection.daysUntilDanger === 1 ? '' : 's'}</strong>. Adjust sleep, screen time, or workload now.</span>`;
    return;
  }

  if (projection?.daysUntilDanger !== null) {
    banner.className = 'warning-banner amber';
    banner.style.display = 'flex';
    banner.innerHTML = `<span class="warning-icon">📉</span><span>Trending toward burnout in <strong>${projection.daysUntilDanger} days</strong> if this pattern continues.</span>`;
    return;
  }

  if (projection && projection.slope < -0.4 && score < 45) {
    banner.className = 'warning-banner good';
    banner.style.display = 'flex';
    banner.innerHTML = `<span class="warning-icon">✅</span><span>Risk is dropping. You're recovering — keep it up.</span>`;
    return;
  }

  banner.style.display = 'none';
}

// ── Main render ──────────────────────────────────────────

function render() {
  const entries    = getEntries();
  const scoreData  = calcBurnoutScore(entries);
  const projection = projectScore(entries);

  renderWarning(scoreData, projection);

  const gaugeSection     = document.getElementById('gaugeSection');
  const breakdownSection = document.getElementById('breakdownSection');
  const forecastSection  = document.getElementById('forecastSection');
  const emptyState       = document.getElementById('emptyState');

  renderTips(scoreData);

  if (!scoreData) {
    gaugeSection.style.display   = 'none';
    emptyState.style.display     = 'flex';
    forecastSection.style.display = 'none';
  } else {
    gaugeSection.style.display   = 'flex';
    emptyState.style.display     = 'none';
    forecastSection.style.display = 'block';

    renderGauge(Math.round(scoreData.total));
    breakdownSection.innerHTML = renderBreakdown(scoreData);

    if (projection) {
      const cur     = Math.round(projection.current);
      const p7      = Math.round(projection.projected7);
      const trendCls = projection.slope > 0.15 ? 'trend-up' : projection.slope < -0.15 ? 'trend-down' : 'trend-flat';
      const trendTxt = projection.slope > 0.15 ? '↑ rising' : projection.slope < -0.15 ? '↓ falling' : '→ stable';
      forecastSection.innerHTML = `
        <div class="card-title">7-Day Forecast</div>
        <div class="forecast-row">
          <div class="forecast-item">
            <div class="forecast-label">Now</div>
            <div class="forecast-score" style="color:${riskInfo(cur).color}">${cur}</div>
          </div>
          <div class="forecast-arrow">→</div>
          <div class="forecast-item">
            <div class="forecast-label">In 7 days</div>
            <div class="forecast-score" style="color:${riskInfo(p7).color}">${p7}</div>
          </div>
          <div class="forecast-trend ${trendCls}">${trendTxt}</div>
        </div>
      `;
    } else {
      forecastSection.innerHTML = `<div class="card-title">7-Day Forecast</div><p class="muted">Log more days for a forecast.</p>`;
    }
  }

  const hasData         = entries.length > 0;
  const trendsPaneActive = document.getElementById('page-trends').classList.contains('active');

  document.getElementById('burnoutChartSection').style.display = entries.length >= 3 ? 'block' : 'none';
  document.getElementById('chartSection').style.display       = hasData ? 'block' : 'none';
  document.getElementById('healthChartSection').style.display = hasData ? 'block' : 'none';
  document.getElementById('trendsEmpty').style.display        = hasData ? 'none'  : 'flex';
  document.getElementById('historySection').style.display     = hasData ? 'block' : 'none';
  document.getElementById('historyEmpty').style.display       = hasData ? 'none'  : 'flex';

  if (hasData) {
    if (trendsPaneActive) {
      renderCharts(entries);
      if (entries.length >= 3) renderBurnoutChart(entries);
    }
    renderHistory(entries);
  }

  syncFormState(entries);
}

// ── Form ─────────────────────────────────────────────────

document.getElementById('logForm').addEventListener('submit', e => {
  e.preventDefault();

  const sleep      = toDecimal('sleepHr',    'sleepMin');
  const work       = toDecimal('workHr',     'workMin');
  const screenTime = toDecimal('screenHr',   'screenMin');
  const social     = toDecimal('socialHr',   'socialMin');
  const exercise   = toDecimal('exerciseHr', 'exerciseMin');
  const outdoor    = toDecimal('outdoorHr',  'outdoorMin');
  const caffeine   = parseInt(document.getElementById('caffeineInput').value);
  const output     = parseInt(document.getElementById('outputInput').value);
  const mood       = parseInt(document.getElementById('moodInput').value);
  const stress     = parseInt(document.getElementById('stressInput').value);
  const motivation = parseInt(document.getElementById('motivationInput').value);
  const eveningWork = document.getElementById('eveningWorkInput').checked;

  if ([caffeine, output, mood, stress, motivation].some(isNaN)) return;

  const logDateVal = document.getElementById('logDate').value || today();
  saveEntry({ date: logDateVal, sleep, work, screenTime, eveningWork, social, exercise, outdoor, caffeine, output, mood, stress, motivation });
  render();
});

// Page tab switching — syncs both top bar and mobile nav
document.querySelectorAll('.page-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const page = tab.dataset.page;
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll(`.page-tab[data-page="${page}"]`).forEach(t => t.classList.add('active'));
    document.getElementById('page-' + page).classList.add('active');
    // App-shell scrolls .main (not the window) — start each tab at the top
    const mainEl = document.querySelector('.main');
    if (mainEl) mainEl.scrollTop = 0;
    if (page === 'trends') {
      const entries = getEntries();
      if (entries.length > 0) renderCharts(entries);
      if (entries.length >= 3) renderBurnoutChart(entries);
    }
  });
});

// Slider sync
['output', 'mood', 'stress', 'motivation'].forEach(name => {
  const input   = document.getElementById(`${name}Input`);
  const display = document.getElementById(`${name}Display`);
  input.addEventListener('input', () => { display.textContent = input.value; });
});

// Evening work toggle label
document.getElementById('eveningWorkInput').addEventListener('change', function () {
  const label = document.getElementById('eveningWorkLabel');
  label.textContent  = this.checked ? 'Yes' : 'No';
  label.style.color  = this.checked ? 'var(--orange)' : '';
});

// Caffeine stepper
const caffeineInput   = document.getElementById('caffeineInput');
const caffeineDisplay = document.getElementById('caffeineDisplay');

document.getElementById('caffeineUp').addEventListener('click', () => {
  const v = Math.min(20, parseInt(caffeineInput.value) + 1);
  caffeineInput.value = v;
  caffeineDisplay.textContent = v;
});

document.getElementById('caffeineDown').addEventListener('click', () => {
  const v = Math.max(0, parseInt(caffeineInput.value) - 1);
  caffeineInput.value = v;
  caffeineDisplay.textContent = v;
});

// ── Demo data ────────────────────────────────────────────

document.getElementById('demoBtn').addEventListener('click', () => {
  const seed = [
    { daysAgo: 13, sleep: 8,   work: 7,    screenTime: 7,    social: 2,   exercise: 0.75, outdoor: 1,    eveningWork: false, caffeine: 2, output: 9, mood: 9, stress: 2, motivation: 9 },
    { daysAgo: 12, sleep: 8,   work: 7.5,  screenTime: 7.5,  social: 1.5, exercise: 0.67, outdoor: 0.75, eveningWork: false, caffeine: 2, output: 8, mood: 8, stress: 3, motivation: 8 },
    { daysAgo: 11, sleep: 7.5, work: 8,    screenTime: 8,    social: 1,   exercise: 0.5,  outdoor: 0.5,  eveningWork: false, caffeine: 3, output: 8, mood: 8, stress: 3, motivation: 8 },
    { daysAgo: 10, sleep: 7,   work: 8.5,  screenTime: 9,    social: 1,   exercise: 0.33, outdoor: 0.5,  eveningWork: false, caffeine: 3, output: 7, mood: 7, stress: 4, motivation: 7 },
    { daysAgo: 9,  sleep: 6.5, work: 9,    screenTime: 10,   social: 0.5, exercise: 0.25, outdoor: 0.25, eveningWork: true,  caffeine: 4, output: 7, mood: 7, stress: 5, motivation: 7 },
    { daysAgo: 8,  sleep: 6.5, work: 9.5,  screenTime: 10.5, social: 0.5, exercise: 0.17, outdoor: 0.25, eveningWork: true,  caffeine: 4, output: 6, mood: 6, stress: 6, motivation: 6 },
    { daysAgo: 7,  sleep: 6,   work: 10,   screenTime: 11,   social: 0.5, exercise: 0.08, outdoor: 0.25, eveningWork: true,  caffeine: 5, output: 6, mood: 6, stress: 6, motivation: 5 },
    { daysAgo: 6,  sleep: 5.5, work: 10,   screenTime: 12,   social: 0.5, exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 5, output: 5, mood: 5, stress: 7, motivation: 5 },
    { daysAgo: 5,  sleep: 5.5, work: 10.5, screenTime: 12,   social: 0.5, exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 6, output: 5, mood: 4, stress: 7, motivation: 4 },
    { daysAgo: 4,  sleep: 5,   work: 11,   screenTime: 13,   social: 0,   exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 6, output: 4, mood: 4, stress: 8, motivation: 4 },
    { daysAgo: 3,  sleep: 5,   work: 11,   screenTime: 13,   social: 0,   exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 7, output: 4, mood: 3, stress: 8, motivation: 3 },
    { daysAgo: 2,  sleep: 4.5, work: 11.5, screenTime: 13,   social: 0,   exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 7, output: 3, mood: 3, stress: 9, motivation: 3 },
    { daysAgo: 1,  sleep: 4.5, work: 12,   screenTime: 14,   social: 0,   exercise: 0,    outdoor: 0,    eveningWork: true,  caffeine: 8, output: 3, mood: 2, stress: 9, motivation: 2 },
  ];
  const now = new Date();
  seed.forEach(d => {
    const date = new Date(now);
    date.setDate(date.getDate() - d.daysAgo);
    saveEntry({ date: localDateStr(date), ...d });
  });
  render();
});

// ── Clear all ─────────────────────────────────────────────

document.getElementById('clearBtn').addEventListener('click', () => {
  clearAll();
  const _ld = document.getElementById('logDate');
  if (_ld) { _ld.value = today(); _ld.max = today(); }
  clearFormFields();
  render();
});

// ── Init ─────────────────────────────────────────────────

document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// ── Theme toggle ─────────────────────────────────────────
(function () {
  const THEME_KEY = 'burnit_theme';
  const btn = document.getElementById('themeToggle');

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem(THEME_KEY, theme);
  }

  // Sync button icon with current theme (already set by anti-flash script)
  apply(document.documentElement.getAttribute('data-theme') || 'dark');

  if (btn) btn.addEventListener('click', () => {
    apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    // Re-render theme-aware elements
    render();
    const entries = getEntries();
    if (entries.length > 0 && document.getElementById('page-trends').classList.contains('active')) {
      renderCharts(entries);
      if (entries.length >= 3) renderBurnoutChart(entries);
    }
  });
})();

// ── Log date picker ───────────────────────────────────────
(function () {
  const el = document.getElementById('logDate');
  if (!el) return;
  el.value = today();
  el.max   = today();
  el.addEventListener('change', function () {
    const entries = getEntries();
    const entry   = entries.find(e => e.date === this.value);
    const isToday = this.value === today();
    const label   = isToday ? 'Today' : formatDate(this.value);
    const logBtn    = document.getElementById('logBtn');
    const logStatus = document.getElementById('logStatus');
    if (entry) {
      populateFormFromEntry(entry);
      logBtn.textContent    = `Update ${label}`;
      logStatus.textContent = `✓ Already logged ${isToday ? 'today' : label}`;
      logStatus.style.color = '#22c55e';
    } else {
      clearFormFields();
      logBtn.textContent    = `Log ${label}`;
      logStatus.textContent = '';
    }
  });
})();

render();
