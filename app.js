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
        <path d="${bgD}" fill="none" stroke="#26262f" stroke-width="${sw}" stroke-linecap="round"/>
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

const chartOpts = (yMax) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { labels: { color: '#6b7280', font: { family: 'Inter,system-ui,sans-serif', size: 12 }, boxWidth: 12, padding: 14 } },
    tooltip: { backgroundColor: '#1c1c22', borderColor: '#26262f', borderWidth: 1, titleColor: '#e5e5e7', bodyColor: '#9ca3af' },
  },
  scales: {
    x: { grid: { color: '#1e1e26' }, ticks: { color: '#4b5563', font: { size: 11 } } },
    y: { grid: { color: '#1e1e26' }, ticks: { color: '#4b5563', font: { size: 11 } }, min: 0, max: yMax },
  },
});

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

// ── Tips ─────────────────────────────────────────────────

const TIP_LABELS = { '😴':'Sleep', '💼':'Work', '😤':'Stress', '💻':'Screen', '😊':'Mood', '🎯':'Motivation', '📊':'Output', '🌙':'Evening Work', '🏃':'Exercise', '🌿':'Outdoor', '👥':'Social' };
function tipLabel(icon) { return TIP_LABELS[icon] || ''; }

function renderTips(scoreData) {
  const sec = document.getElementById('tipsSection');
  if (!scoreData || scoreData.total < 20) { sec.style.display = 'none'; return; }

  const { sleepP, workP, stressP, screenP, moodP, motivP,
          outputP, eveningP, exerciseP, outdoorP, socialP } = scoreData;

  const candidates = [];

  if      (sleepP >= 13) candidates.push({ score: sleepP, icon: '😴', text: 'Averaging under 5h of sleep. Sleep is the #1 recovery tool — set a fixed bedtime tonight and protect it.' });
  else if (sleepP >= 9)  candidates.push({ score: sleepP, icon: '😴', text: 'Under 6h average sleep. Cutting screens 30 min before bed can unlock an extra hour of quality rest.' });
  else if (sleepP >= 6)  candidates.push({ score: sleepP, icon: '😴', text: 'Sleep is close but not optimal. Aim for 7.5h — a consistent wake time is more impactful than bedtime.' });
  else if (sleepP >= 2)  candidates.push({ score: sleepP, icon: '😴', text: 'Sleep is nearly on track. Keep the same wake time every day, including weekends.' });

  if      (workP >= 12)  candidates.push({ score: workP, icon: '💼', text: 'Averaging 10h+ work days. Set a hard stop time and honor it — your brain needs a genuine end to the workday.' });
  else if (workP >= 8)   candidates.push({ score: workP, icon: '💼', text: '9–10h work days are accumulating. Block a buffer after work before any evening activity.' });
  else if (workP >= 4)   candidates.push({ score: workP, icon: '💼', text: 'Work hours slightly elevated. Aim for one lighter day per week and cap others at 8h.' });

  if      (stressP >= 8) candidates.push({ score: stressP, icon: '😤', text: 'Stress is very high. Schedule 10–20 min of decompression daily — walking, breathing exercises, or journaling.' });
  else if (stressP >= 5) candidates.push({ score: stressP, icon: '😤', text: 'Moderate-high stress. Write down your top stressor and one small action you can take on it today.' });
  else if (stressP >= 2) candidates.push({ score: stressP, icon: '😤', text: 'Some stress is present. Ensure at least one restorative activity per day — even 10 minutes counts.' });

  if      (screenP >= 8) candidates.push({ score: screenP, icon: '💻', text: '12h+ of daily screen time depletes focus and sleep quality. Try a 1-hour no-screen break in the afternoon.' });
  else if (screenP >= 5) candidates.push({ score: screenP, icon: '💻', text: 'High screen exposure. Screen-free meals and going offline 30 min before bed make a measurable difference.' });
  else if (screenP >= 2) candidates.push({ score: screenP, icon: '💻', text: 'Slightly elevated screen time. Use the 20-20-20 rule: every 20 min, look 20 ft away for 20 seconds.' });

  if      (moodP >= 7)   candidates.push({ score: moodP, icon: '😊', text: 'Mood is consistently low. Talk to someone you trust today — social connection is the fastest mood reset.' });
  else if (moodP >= 5)   candidates.push({ score: moodP, icon: '😊', text: 'Mood is dipping. Complete one small easy task and acknowledge finishing it — small wins rebuild momentum.' });
  else if (moodP >= 2)   candidates.push({ score: moodP, icon: '😊', text: 'Mood could use support. Brief outdoor time and physical movement both have an immediate positive effect.' });

  if      (motivP >= 7)  candidates.push({ score: motivP, icon: '🎯', text: 'Motivation is very low. Break work into 25-minute sprints — starting is the hardest part, then it gets easier.' });
  else if (motivP >= 5)  candidates.push({ score: motivP, icon: '🎯', text: 'Motivation is low. Write down one reason you care about what you\'re working on — reconnecting with purpose helps.' });
  else if (motivP >= 2)  candidates.push({ score: motivP, icon: '🎯', text: 'Motivation is wavering. Reduce friction: prepare your workspace and first task the night before.' });

  if      (outputP >= 5) candidates.push({ score: outputP, icon: '📊', text: 'Low output signals cognitive fatigue. Rest is productive — schedule real breaks, not phone scrolling.' });
  else if (outputP >= 3) candidates.push({ score: outputP, icon: '📊', text: 'Output declining. Try single-tasking with deep focus blocks and close all unrelated tabs.' });

  if      (eveningP >= 6) candidates.push({ score: eveningP, icon: '🌙', text: 'Working evenings 80%+ of days. Your brain cannot recover without wind-down time — protect at least 3 evenings per week.' });
  else if (eveningP >= 4) candidates.push({ score: eveningP, icon: '🌙', text: 'Evening work is frequent. Stop working 2h before bed — it directly improves the depth of your sleep.' });
  else if (eveningP >= 2) candidates.push({ score: eveningP, icon: '🌙', text: 'Occasional evening work adds up. Create a shutdown ritual to signal your brain that the workday is done.' });

  if      (exerciseP >= 5) candidates.push({ score: exerciseP, icon: '🏃', text: 'No exercise logged. Even a 20-minute walk daily reduces cortisol, clears mental fog, and improves sleep.' });
  else if (exerciseP >= 4) candidates.push({ score: exerciseP, icon: '🏃', text: 'Very little movement. Short walks or stretching count — start with 15 minutes any time of day.' });
  else if (exerciseP >= 2) candidates.push({ score: exerciseP, icon: '🏃', text: 'Exercise is low. Aim for 30 min of movement at least 3× per week — consistency beats intensity.' });

  if      (outdoorP >= 4) candidates.push({ score: outdoorP, icon: '🌿', text: 'No outdoor time logged. Natural light resets your circadian rhythm and lowers baseline cortisol.' });
  else if (outdoorP >= 2) candidates.push({ score: outdoorP, icon: '🌿', text: 'Low outdoor exposure. Try eating lunch outside or a 10-min walk between tasks.' });

  if      (socialP >= 3) candidates.push({ score: socialP, icon: '👥', text: 'No social interaction logged. Isolation amplifies burnout — reach out to one person today, even briefly.' });
  else if (socialP >= 2) candidates.push({ score: socialP, icon: '👥', text: 'Very little social time. Even a 10-minute call with a friend helps buffer against burnout.' });

  const top = candidates.sort((a, b) => b.score - a.score).slice(0, 3);

  const habits = [
    { icon: '😴', action: 'Sleep 7–8h', detail: 'Same wake time daily — even weekends' },
    { icon: '🛑', action: 'Hard work cutoff', detail: 'Pick a fixed end time and put phone on DND' },
    { icon: '🏃', action: 'Walk 20 min daily', detail: 'Any time — reduces cortisol immediately' },
    { icon: '⏱️', action: '90-min focus blocks', detail: '5–10 min break after each block, no exceptions' },
    { icon: '📵', action: 'Screen-free meals', detail: 'One guaranteed daily restoration moment' },
    { icon: '📅', action: 'One full rest day/week', detail: 'No work — non-negotiable recovery' },
    { icon: '🌿', action: '10 min outdoors', detail: 'Natural light resets your circadian rhythm' },
    { icon: '📝', action: 'Plan tomorrow tonight', detail: 'Write your top 3 tasks — removes decision fatigue' },
  ];

  sec.style.display = 'block';
  sec.innerHTML = `
    <div class="card-title">How to Lower Your Score</div>

    <div class="tips-section-label">Your top priorities right now</div>
    <div class="tips-list">
      ${top.map((t, i) => `
        <div class="tip-item">
          <span class="tip-num">${i + 1}</span>
          <div class="tip-body">
            <span class="tip-label">${t.icon} ${tipLabel(t.icon)}</span>
            <span class="tip-text">${t.text}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="tips-footer">Address in this order for fastest score drop.</div>

    <div class="habits-divider"></div>
    <div class="tips-section-label">Daily habits that actually work</div>
    <div class="habits-grid">
      ${habits.map(h => `
        <div class="habit-item">
          <span class="habit-icon">${h.icon}</span>
          <div class="habit-body">
            <span class="habit-action">${h.action}</span>
            <span class="habit-detail">${h.detail}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
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

  document.getElementById('chartSection').style.display       = hasData ? 'block' : 'none';
  document.getElementById('healthChartSection').style.display = hasData ? 'block' : 'none';
  document.getElementById('trendsEmpty').style.display        = hasData ? 'none'  : 'flex';
  document.getElementById('historySection').style.display     = hasData ? 'block' : 'none';
  document.getElementById('historyEmpty').style.display       = hasData ? 'none'  : 'flex';

  if (hasData) {
    if (trendsPaneActive) renderCharts(entries);
    renderHistory(entries);
  }

  // Sync log form with today's entry if it exists
  const t  = today();
  const te = entries.find(e => e.date === t);
  const logBtn    = document.getElementById('logBtn');
  const logStatus = document.getElementById('logStatus');

  if (te) {
    logBtn.textContent      = 'Update Today';
    logStatus.textContent   = '✓ Already logged today';
    logStatus.style.color   = '#22c55e';
    fromDecimal(te.sleep,         'sleepHr',    'sleepMin');
    fromDecimal(te.work    ?? 0,  'workHr',     'workMin');
    fromDecimal(te.screenTime,    'screenHr',   'screenMin');
    fromDecimal(te.social  ?? 0,  'socialHr',   'socialMin');
    fromDecimal(te.exercise ?? 0, 'exerciseHr', 'exerciseMin');
    fromDecimal(te.outdoor ?? 0,  'outdoorHr',  'outdoorMin');
    document.getElementById('caffeineInput').value          = te.caffeine   ?? 0;
    document.getElementById('caffeineDisplay').textContent  = te.caffeine   ?? 0;
    document.getElementById('outputInput').value            = te.output;
    document.getElementById('moodInput').value              = te.mood;
    document.getElementById('outputDisplay').textContent    = te.output;
    document.getElementById('moodDisplay').textContent      = te.mood;
    const si = te.stress ?? 5;
    const mi = te.motivation ?? 5;
    document.getElementById('stressInput').value            = si;
    document.getElementById('motivationInput').value        = mi;
    document.getElementById('stressDisplay').textContent    = si;
    document.getElementById('motivationDisplay').textContent = mi;
    const ew = te.eveningWork ?? false;
    document.getElementById('eveningWorkInput').checked     = ew;
    document.getElementById('eveningWorkLabel').textContent = ew ? 'Yes' : 'No';
    document.getElementById('eveningWorkLabel').style.color = ew ? 'var(--orange)' : '';
  } else {
    logBtn.textContent    = 'Log Today';
    logStatus.textContent = '';
  }
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

  saveEntry({ date: today(), sleep, work, screenTime, eveningWork, social, exercise, outdoor, caffeine, output, mood, stress, motivation });
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
  ['sleepHr','sleepMin','workHr','workMin','screenHr','screenMin',
   'socialHr','socialMin','exerciseHr','exerciseMin','outdoorHr','outdoorMin'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('caffeineInput').value          = 0;
  document.getElementById('caffeineDisplay').textContent  = 0;
  document.getElementById('outputInput').value            = 5;
  document.getElementById('moodInput').value              = 5;
  document.getElementById('stressInput').value            = 5;
  document.getElementById('motivationInput').value        = 5;
  document.getElementById('outputDisplay').textContent    = 5;
  document.getElementById('moodDisplay').textContent      = 5;
  document.getElementById('stressDisplay').textContent    = 5;
  document.getElementById('motivationDisplay').textContent = 5;
  document.getElementById('eveningWorkInput').checked     = false;
  document.getElementById('eveningWorkLabel').textContent = 'No';
  document.getElementById('eveningWorkLabel').style.color = '';
  render();
});

// ── Init ─────────────────────────────────────────────────

document.getElementById('headerDate').textContent = new Date().toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

render();
