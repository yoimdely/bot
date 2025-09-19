
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}
const key = 'sexhealth.events.v1';

const form = document.getElementById('eventForm');
const kpisEl = document.getElementById('kpis');
const chartEl = document.getElementById('chart');
const tipsEl = document.getElementById('tips');
const historyEl = document.getElementById('history');
const premiumBtn = document.getElementById('premiumBtn');
const exportBtn = document.getElementById('exportBtn');

function load(){ try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch { return []; } }
function save(list){ localStorage.setItem(key, JSON.stringify(list)); }

function toCSV(list){
  const header = ['datetime','partner','mood','protected','note'];
  const rows = list.map(e => [
    new Date(e.ts).toISOString(),
    (e.partner||'').replace(/"/g,'""'),
    e.mood,
    e.protected?'yes':'no',
    (e.note||'').replace(/"/g,'""')
  ]);
  return [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}

function renderKPIs(list){
  const now = Date.now();
  const week = 7*24*3600*1000;
  const recent = list.filter(x => now - x.ts <= week);
  const total7 = recent.length;
  const prot = recent.length ? Math.round(100*recent.filter(x=>x.protected).length/recent.length) : 0;
  kpisEl.innerHTML = `
    <div class="kpi"><div class="num">${total7}</div><div class="lbl">за 7 дней</div></div>
    <div class="kpi"><div class="num">${prot}%</div><div class="lbl">защита</div></div>
  `;
}

function renderChart(list){
  const days = [...Array(7)].map((_,i) => {
    const d = new Date(); d.setDate(d.getDate()- (6-i)); d.setHours(0,0,0,0);
    const start = d.getTime();
    const end = start + 24*3600*1000;
    return list.filter(x => x.ts>=start && x.ts<end).length;
  });
  const maxVal = Math.max(1, ...days);
  const w = chartEl.clientWidth || 600, h = 120, pad = 20;
  const barW = (w - pad*2) / days.length;
  const bars = days.map((v,i) => {
    const x = pad + i*barW;
    const bh = Math.round((v/maxVal) * (h-pad*2));
    const y = h - pad - bh;
    return `<rect x="${x+6}" y="${y}" width="${barW-12}" height="${bh}" rx="8" ry="8" />`;
  }).join('');
  chartEl.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" class="bars">
    <defs>
      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#22c55e"/><stop offset="100%" stop-color="#38bdf8"/>
      </linearGradient>
    </defs>
    <g fill="url(#g1)">${bars}</g>
  </svg>`;
}

function renderTips(list){
  const now = Date.now();
  const week = 7*24*3600*1000;
  const recent = list.filter(x => now - x.ts <= week);
  const total7 = recent.length;
  const prot = recent.length ? Math.round(100*recent.filter(x=>x.protected).length/recent.length) : 0;
  const tips = [];
  if (prot < 60) tips.push('Используй барьерные средства и проходи регулярные тесты.');
  if (total7 > 5) tips.push('Следи за восстановлением: сон 7–9 ч., вода, отдых.');
  if (!tips.length) tips.push('Поддерживай регулярный сон и активность 150+ мин/нед.');
  tipsEl.innerHTML = tips.map(t=>`<li>${t}</li>`).join('');
}

function renderHistory(list){
  historyEl.innerHTML = list.sort((a,b)=>b.ts-a.ts).map(e=>{
    const d = new Date(e.ts).toLocaleString();
    const safe = (s)=> (s||'').replace(/</g,'&lt;');
    return `<div class="hist">
      <div><b>${d}</b><div class="note">${safe(e.note)}</div></div>
      <div>${safe(e.mood)} ${e.protected ? '• 🛡️' : ''} ${e.partner? '• '+safe(e.partner):''}</div>
    </div>`;
  }).join('') || '<div class="muted">Пока пусто</div>';
}

function renderAll(){
  const list = load();
  renderKPIs(list);
  renderChart(list);
  renderTips(list);
  renderHistory(list);
}

form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const dt = document.getElementById('dt').value;
  if (!dt) return alert('Укажи дату/время');
  const payload = {
    ts: new Date(dt).getTime(),
    partner: document.getElementById('partner').value.trim(),
    mood: document.getElementById('mood').value,
    protected: document.getElementById('protected').checked,
    note: document.getElementById('note').value.trim()
  };
  const list = load(); list.push(payload); save(list);
  try { tg?.sendData?.(JSON.stringify({ type:'event_add', payload })); } catch {}
  form.reset(); renderAll(); tg?.HapticFeedback?.notificationOccurred?.('success');
});

premiumBtn.addEventListener('click', async ()=>{
  try {
    const res = await fetch('/stars-link'); // same origin (bot server)
    const { link } = await res.json();
    if (tg?.openInvoice) {
      tg.openInvoice(link, (status)=>{
        if (status === 'paid') alert('Premium активирован!');
      });
    } else {
      window.open(link, '_blank');
    }
  } catch (e) {
    alert('Не удалось открыть платежную форму');
  }
});

exportBtn.addEventListener('click', ()=>{
  const csv = toCSV(load());
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'sexhealth_export.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

renderAll();
