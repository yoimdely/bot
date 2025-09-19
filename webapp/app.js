
const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const key = 'sexhealth.events.v2';
const pinKey = 'sexhealth.pin';

const form = document.getElementById('eventForm');
const kpisEl = document.getElementById('kpis');
const historyEl = document.getElementById('history');
const clearBtn = document.getElementById('clearBtn');
const exportCsvBtn = document.getElementById('exportCsv');
const exportPdfBtn = document.getElementById('exportPdf');
const filterCat = document.getElementById('filterCat');
const lockBtn = document.getElementById('lockBtn');
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
const pinSetBtn = document.getElementById('pinSet');
const pinCheckBtn = document.getElementById('pinCheck');

let chart;

// ---------- Storage ----------
function load(){ try{ return JSON.parse(localStorage.getItem(key)||'[]'); }catch{ return []; } }
function save(list){ localStorage.setItem(key, JSON.stringify(list)); }

// ---------- PIN ----------
function hasPin(){ return !!localStorage.getItem(pinKey); }
function setPin(v){ localStorage.setItem(pinKey, v); }
function checkPin(v){ return localStorage.getItem(pinKey) === v; }

lockBtn.addEventListener('click', ()=> {
  pinInput.value = '';
  pinModal.showModal();
});

// set or check
pinSetBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const v = pinInput.value.trim();
  if (!v) return alert('Укажи PIN');
  setPin(v);
  pinModal.close();
  alert('PIN установлен');
});

pinCheckBtn.addEventListener('click', (e)=>{
  e.preventDefault();
  const v = pinInput.value.trim();
  if (!v) return;
  if (hasPin() && !checkPin(v)) return alert('Неверный PIN');
  pinModal.close();
});

// ---------- Render ----------
function renderKPIs(list){
  const now = Date.now(), week = 7*24*3600*1000;
  const filtered = applyFilter(list).filter(x => now - x.ts <= week);
  const total7 = filtered.length;
  const prot = filtered.length ? Math.round(100*filtered.filter(x=>x.protected).length/filtered.length) : 0;
  const orgasmRate = filtered.length ? Math.round(100*filtered.filter(x=>x.orgasm).length/filtered.length) : 0;
  kpisEl.innerHTML = `
    <div class="kpi"><div class="num">${total7}</div><div class="lbl">за 7 дней</div></div>
    <div class="kpi"><div class="num">${prot}%</div><div class="lbl">защита</div></div>
    <div class="kpi"><div class="num">${orgasmRate}%</div><div class="lbl">оргазм</div></div>
  `;
}

function buildChartData(list){
  // last 7 days
  const days = [];
  for (let i=6;i>=0;i--){
    const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    days.push({ label: d.toLocaleDateString(), start: d.getTime(), end: d.getTime()+24*3600*1000 });
  }
  const filtered = applyFilter(list);
  const counts = days.map(({start,end}) => filtered.filter(x => x.ts>=start && x.ts<end).length);
  return { labels: days.map(d=>d.label), counts };
}

function renderChart(list){
  const { labels, counts } = buildChartData(list);
  const ctx = document.getElementById('chart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'События',
        data: counts,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display:false } },
      scales: {
        x: { grid: { display:false } },
        y: { beginAtZero:true, ticks: { precision:0 } }
      }
    }
  });
}

function renderTips(list){
  const now = Date.now(), week = 7*24*3600*1000;
  const recent = applyFilter(list).filter(x => now - x.ts <= week);
  const total7 = recent.length;
  const prot = recent.length ? Math.round(100*recent.filter(x=>x.protected).length/recent.length) : 0;
  const tips = [];
  if (prot < 60) tips.push('Барьерная защита и регулярные тесты — базовая безопасность.');
  if (total7 > 5) tips.push('Добавь дни восстановления: сон 7–9 ч., вода, питание, без перегрузки.');
  if (!tips.length) tips.push('Стабильный график сна и физ. активность 150+ мин/нед. поддержат либидо и гормоны.');
  document.getElementById('tips').innerHTML = tips.map(t=>`<li>${t}</li>`).join('');
}

function renderHistory(list){
  const data = applyFilter(list).sort((a,b)=>b.ts-a.ts);
  historyEl.innerHTML = data.map(e=>{
    const d = new Date(e.ts).toLocaleString();
    const safe = (s)=> (s||'').replace(/</g,'&lt;');
    const cat = {
      sex:'Секс', masturbation:'Мастурбация', date:'Свидание', foreplay:'Прелюдия', other:'Другое'
    }[e.category] || e.category;
    return `<div class="hist">
      <div><b>${d}</b><div class="note">${safe(e.note)}</div></div>
      <div>${cat} • ${safe(e.mood)} ${e.protected ? '• 🛡️' : ''} ${e.orgasm ? '• ✨' : ''} ${e.partner? '• '+safe(e.partner):''}</div>
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

// ---------- Filter ----------
function applyFilter(list){
  const cat = filterCat.value;
  if (cat === 'all') return list;
  return list.filter(x => x.category === cat);
}
filterCat.addEventListener('change', renderAll);

// ---------- Submit ----------
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const dt = document.getElementById('dt').value;
  if (!dt) return alert('Укажи дату/время');
  const payload = {
    ts: new Date(dt).getTime(),
    category: document.getElementById('category').value,
    partner: document.getElementById('partner').value.trim(),
    mood: document.getElementById('mood').value,
    protected: document.getElementById('protected').checked,
    orgasm: document.getElementById('orgasm').checked,
    note: document.getElementById('note').value.trim()
  };
  const list = load(); list.push(payload); save(list);
  try { tg?.sendData?.(JSON.stringify({ type:'event_add', payload })); } catch {}
  form.reset(); renderAll(); tg?.HapticFeedback?.notificationOccurred?.('success');
});

// ---------- Clear ----------
clearBtn.addEventListener('click', ()=>{
  if (!confirm('Точно удалить все записи?')) return;
  localStorage.removeItem(key);
  renderAll();
});

// ---------- Exports ----------
function toCSV(list){
  const header = ['datetime','category','partner','mood','protected','orgasm','note'];
  const rows = list.map(e => [
    new Date(e.ts).toISOString(),
    e.category,
    (e.partner||'').replace(/"/g,'""'),
    e.mood,
    e.protected?'yes':'no',
    e.orgasm?'yes':'no',
    (e.note||'').replace(/"/g,'""')
  ]);
  return [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
}
exportCsvBtn.addEventListener('click', ()=>{
  const csv = toCSV(load());
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'sexhealth_export.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

exportPdfBtn.addEventListener('click', ()=>{
  const list = load();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text('Sex Health — Отчёт', 14, 18);
  doc.setFontSize(10); doc.text('Экспортировано: ' + new Date().toLocaleString(), 14, 26);
  const lines = applyFilter(list).slice(0, 40).map(e=>{
    const d = new Date(e.ts).toLocaleString();
    return `${d} | ${e.category} | ${e.mood} ${e.protected?'•shield':''} ${e.orgasm?'•orgasm':''} ${e.partner? '• '+e.partner:''} ${e.note? '— '+e.note:''}`;
  });
  let y = 36;
  lines.forEach(l => { if (y>280){ doc.addPage(); y=20; } doc.text(l, 14, y); y += 6; });
  doc.save('sexhealth_report.pdf');
});

renderAll();
