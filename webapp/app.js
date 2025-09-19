
const tg = window.Telegram?.WebApp; if (tg){ tg.ready(); tg.expand(); }
const storeKey='sexhealth.events.v4'; const pinKey='sexhealth.pin.v4';
const facts=[
  "Регулярный сон улучшает гормональный баланс и либидо.",
  "Стресс напрямую влияет на сексуальное здоровье — найди способы расслабляться.",
  "Физическая активность повышает уровень тестостерона и настроение.",
  "Поддерживай водный баланс: это влияет и на самочувствие, и на либидо.",
  "Барьерная защита уменьшает риск ИППП и повышает спокойствие."
];

// Tabs
const tabs = document.querySelectorAll('.tab'); const panels = document.querySelectorAll('.panel');
const btabs = document.querySelectorAll('.btab');
function switchTab(name){
  tabs.forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  btabs.forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  panels.forEach(p=>p.classList.toggle('active', p.id==='tab-'+name));
}
tabs.forEach(t=> t.addEventListener('click', ()=> switchTab(t.dataset.tab)));
btabs.forEach(t=> t.addEventListener('click', ()=> switchTab(t.dataset.tab)));

// Elements
const form = document.getElementById('eventForm');
const kpiTotal = document.getElementById('kpi-total');
const kpiProt = document.getElementById('kpi-prot');
const kpiOrg = document.getElementById('kpi-org');
const clearAll = document.getElementById('clearAll');
const filterCat = document.getElementById('filterCat');
const historyEl = document.getElementById('history');
const exportCsv = document.getElementById('exportCsv');
const exportPdf = document.getElementById('exportPdf');
const factBox = document.getElementById('factBox');

const openInfo = document.getElementById('openInfo');
const openPin = document.getElementById('openPin');
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
const pinSet = document.getElementById('pinSet');
const pinCheck = document.getElementById('pinCheck');

let chart;

// Storage helpers
const load = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '[]'); } catch { return []; } };
const save = (list) => localStorage.setItem(storeKey, JSON.stringify(list));

// PIN
const hasPin = () => !!localStorage.getItem(pinKey);
const setPin = (v) => localStorage.setItem(pinKey, v);
const checkPin = (v) => localStorage.getItem(pinKey) === v;

// Handlers
openInfo.addEventListener('click', ()=> alert('Sex Health — приватный трекер. Цель — осознанность и забота о себе.'));
openPin.addEventListener('click', ()=> { pinInput.value=''; pinModal.showModal(); });
pinSet.addEventListener('click', (e)=>{ e.preventDefault(); const v=pinInput.value.trim(); if(!v) return; setPin(v); pinModal.close(); alert('PIN установлен'); });
pinCheck.addEventListener('click', (e)=>{ e.preventDefault(); const v=pinInput.value.trim(); if(hasPin() && !checkPin(v)) return alert('Неверный PIN'); pinModal.close(); });

filterCat.addEventListener('change', renderAll);

function renderFact(){ factBox.textContent = facts[Math.floor(Math.random()*facts.length)]; }

function applyFilter(list){
  const cat = filterCat.value;
  return cat==='all' ? list : list.filter(x => x.category===cat);
}

function renderKPIs(list){
  const now = Date.now(); const week = 7*24*3600*1000;
  const recent = applyFilter(list).filter(x => now - x.ts <= week);
  const total = recent.length;
  const prot = total ? Math.round(100*recent.filter(x=>x.protected).length/total) : 0;
  const org = total ? Math.round(100*recent.filter(x=>x.orgasm).length/total) : 0;
  kpiTotal.textContent = total; kpiProt.textContent = prot + '%'; kpiOrg.textContent = org + '%';
}

function buildChartData(list){
  const days = [];
  for (let i=6;i>=0;i--){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    days.push({label:d.toLocaleDateString(), start:d.getTime(), end:d.getTime()+86400000}); }
  const l = applyFilter(list);
  const counts = days.map(({start,end}) => l.filter(x=>x.ts>=start && x.ts<end).length);
  return { labels: days.map(d=>d.label), counts };
}

function renderChart(list){
  const { labels, counts } = buildChartData(list);
  const ctx = document.getElementById('chart');
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data: counts, label:'События', borderColor:'#e53935', backgroundColor:'rgba(229,57,53,.15)', fill:true, tension:.35 }]},
    options: { plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{precision:0}} } }
  });
}

function renderHistory(list){
  const data = applyFilter(list).sort((a,b)=>b.ts-a.ts);
  historyEl.innerHTML = data.map(e=>{
    const d=new Date(e.ts).toLocaleString();
    const safe = s => (s||'').replace(/</g,'&lt;');
    const cat = {sex:'Секс',masturbation:'Мастурбация',date:'Свидание',foreplay:'Прелюдия',other:'Другое'}[e.category]||e.category;
    return `<div class="item">
      <div><b>${d}</b><div class="meta">${safe(e.note)}</div></div>
      <div class="meta">${cat} • ${safe(e.mood)} ${e.protected?'• 🛡️':''} ${e.orgasm?'• ✨':''} ${e.partner? '• '+safe(e.partner):''}</div>
    </div>`;
  }).join('') || '<div class="meta">Пока пусто</div>';
}

form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const dt = document.getElementById('dt').value;
  if(!dt) return alert('Укажи дату/время');
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

clearAll.addEventListener('click', ()=>{
  if (!confirm('Удалить все записи?')) return;
  localStorage.removeItem(storeKey); renderAll();
});

function toCSV(list){
  const header = ['datetime','category','partner','mood','protected','orgasm','note'];
  const rows = list.map(e => [ new Date(e.ts).toISOString(), e.category, (e.partner||'').replace(/"/g,'""'), e.mood, e.protected?'yes':'no', e.orgasm?'yes':'no', (e.note||'').replace(/"/g,'""') ]);
  return [header, ...rows].map(r=> r.map(c=>`"${c}"`).join(',')).join('\n');
}
exportCsv.addEventListener('click', ()=>{
  const csv = toCSV(load());
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='sexhealth_export.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
exportPdf.addEventListener('click', ()=>{
  const list = applyFilter(load()); const { jsPDF } = window.jspdf; const doc = new jsPDF();
  doc.setFontSize(16); doc.text('Sex Health — Отчёт', 14, 18);
  doc.setFontSize(10); doc.text('Экспортировано: '+new Date().toLocaleString(), 14, 26);
  let y=36; list.slice(0,100).forEach(e=>{ const ln=`${new Date(e.ts).toLocaleString()} | ${e.category} | ${e.mood} ${e.protected?'• shield':''} ${e.orgasm?'• orgasm':''} ${e.partner? '• '+e.partner:''} ${e.note? '— '+e.note:''}`; if(y>280){ doc.addPage(); y=20; } doc.text(ln, 14, y); y+=6; });
  doc.save('sexhealth_report.pdf');
});

function renderAll(){ const list = load(); renderKPIs(list); renderChart(list); renderHistory(list); renderFact(); }
renderAll();
