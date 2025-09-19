
const tg = window.Telegram?.WebApp; if (tg){ tg.ready(); tg.expand(); }

// Tabs
const tabs = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.panel');
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
const historyEl = document.getElementById('history');
const toast = document.getElementById('toast');
const factBox = document.getElementById('factBox');
const filterCat = document.getElementById('filterCat');

// PIN & Info
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
document.getElementById('openPin').addEventListener('click', ()=>{ pinInput.value=''; pinModal.showModal(); });
document.getElementById('pinSet').addEventListener('click', (e)=>{ e.preventDefault(); localStorage.setItem('sh.pin',''+pinInput.value.trim()); pinModal.close(); alert('PIN установлен'); });
document.getElementById('pinCheck').addEventListener('click', (e)=>{ e.preventDefault(); if(localStorage.getItem('sh.pin') && localStorage.getItem('sh.pin')!==pinInput.value.trim()) return alert('Неверный PIN'); pinModal.close(); });

const infoModal = document.getElementById('infoModal');
document.getElementById('openInfo').addEventListener('click', ()=> infoModal.showModal());
document.getElementById('closeInfo').addEventListener('click', ()=> infoModal.close());

// Facts
const facts=[
  "Регулярный сон улучшает гормональный баланс и либидо.",
  "Стресс снижает качество близости — учись расслабляться.",
  "Двигательная активность повышает настроение и выносливость.",
  "Вода влияет на самочувствие и либидо — следи за питьевым режимом.",
  "Барьерная защита уменьшает риск ИППП — базовая безопасность."
];
function renderFact(){ factBox.textContent = facts[Math.floor(Math.random()*facts.length)]; }

// Storage
const key='sh.events.v5';
function getEvents(){ try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]} }
function setEvents(arr){ localStorage.setItem(key, JSON.stringify(arr)); }

// Helpers
function nowLocalISO(){
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0,16);
}
document.getElementById('dt').value = nowLocalISO();

function catEmoji(cat){
  switch(cat){
    case 'sex': return '❤️';
    case 'masturbation': return '✋';
    case 'date': return '🌹';
    case 'foreplay': return '🔥';
    default: return '✨';
  }
}
function catLabel(cat){
  return {sex:'Секс',masturbation:'Мастурбация',date:'Свидание',foreplay:'Прелюдия',other:'Другое'}[cat]||cat;
}

// Renderers
function renderHistory(list){
  const items = list.slice().sort((a,b)=>b.ts-a.ts);
  historyEl.innerHTML = items.map(e=>{
    const d=new Date(e.ts).toLocaleString();
    const safe = s=>(s||'').replace(/</g,'&lt;');
    const pill=`<span class="pill">${catEmoji(e.category)} ${catLabel(e.category)}</span>`;
    return `<div class="item">
      <div><b>${d}</b><div class="meta">${safe(e.mood)} ${e.protected?'• 🛡️':''} ${e.orgasm?'• ✨':''} ${e.partner? '• '+safe(e.partner):''}</div></div>
      <div>${pill}</div>
      <div class="meta" style="grid-column:1/-1;">${safe(e.note)}</div>
    </div>`;
  }).join('') || '<div class="meta">Пока пусто</div>';
}

function renderKPIs(list){
  const totalEl = document.getElementById('kpi-total');
  const protEl = document.getElementById('kpi-prot');
  const orgEl = document.getElementById('kpi-org');
  const w=7*24*3600*1000, now=Date.now();
  const recent = list.filter(x=> now-x.ts<=w);
  const total = recent.length;
  const prot = total? Math.round(100*recent.filter(x=>x.protected).length/total) : 0;
  const org = total? Math.round(100*recent.filter(x=>x.orgasm).length/total) : 0;
  totalEl.textContent = total; protEl.textContent= prot+'%'; orgEl.textContent= org+'%';
}

let chart;
function buildChartData(list, cat='all'){
  const days=[];
  for(let i=6;i>=0;i--){ const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    days.push({ label:d.toLocaleDateString(), start:d.getTime(), end:d.getTime()+86400000 }); }
  const filtered = cat==='all'? list : list.filter(x=>x.category===cat);
  const counts = days.map(({start,end}) => filtered.filter(x=>x.ts>=start && x.ts<end).length);
  return { labels: days.map(d=>d.label), counts };
}
function renderChart(list, cat='all'){
  const { labels, counts } = buildChartData(list, cat);
  const ctx=document.getElementById('chart');
  if(chart) chart.destroy();
  chart = new Chart(ctx,{
    type:'line',
    data:{ labels, datasets:[{ data:counts, label:'События', borderColor:'#e53935', backgroundColor:'rgba(229,57,53,.15)', tension:.35, fill:true }]},
    options:{ responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{display:false}}, y:{beginAtZero:true, ticks:{precision:0}} } }
  });
}

// Submit
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const dt = document.getElementById('dt').value;
  const ts = new Date(dt).getTime();
  if(!dt || Number.isNaN(ts)) return alert('Укажи корректную дату/время');
  const evn = {
    ts,
    category: document.getElementById('category').value,
    partner: document.getElementById('partner').value.trim(),
    mood: document.getElementById('mood').value,
    protected: document.getElementById('protected').checked,
    orgasm: document.getElementById('orgasm').checked,
    note: document.getElementById('note').value.trim()
  };
  const arr = getEvents(); arr.push(evn); setEvents(arr);
  renderHistory(arr); renderKPIs(arr); renderChart(arr, filterCat?.value||'all');
  toast.classList.add('show'); setTimeout(()=>toast.classList.remove('show'), 1600);
  try{ tg?.HapticFeedback?.notificationOccurred?.('success'); }catch{}
  form.reset(); document.getElementById('dt').value = nowLocalISO();
});

document.getElementById('clearAll').addEventListener('click', ()=>{
  if(!confirm('Удалить все записи?')) return;
  setEvents([]); renderAll();
});

filterCat?.addEventListener('change', ()=> renderChart(getEvents(), filterCat.value));

function renderAll(){
  const arr = getEvents();
  renderHistory(arr);
  renderKPIs(arr);
  renderChart(arr, filterCat?.value||'all');
  renderFact();
}
renderAll();
