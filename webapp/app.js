
const tg = window.Telegram?.WebApp; if(tg){tg.ready();tg.expand();}

const storageKey='sexhealth.events.v3.1';
const pinKey='sexhealth.pin.v3.1';

const facts=[
  "Регулярный сон улучшает гормональный баланс и либидо.",
  "Стресс напрямую влияет на сексуальное здоровье — найди способы расслабляться.",
  "Физическая активность повышает уровень тестостерона и настроение.",
  "Поддерживай водный баланс: это влияет и на самочувствие, и на либидо.",
  "Барьерная защита уменьшает риск ИППП и повышает спокойствие.",
  "Алкоголь краткосрочно расслабляет, но снижает качество эрекции/возбуждения.",
  "Стабильный режим сна поддерживает уровень дофамина и тестостерона.",
  "Дыхательные практики помогают уменьшить тревожность перед близостью.",
  "Насыщенные жиры в избытке ухудшают кровоток — следи за питанием.",
  "Умеренные тренировки улучшают сосудистое здоровье и выносливость."
];

// elements
const form=document.getElementById('eventForm');
const historyEl=document.getElementById('history');
const kpisEl=document.getElementById('kpis');
const filterCat=document.getElementById('filterCat');
const clearBtn=document.getElementById('clearBtn');
const exportCsv=document.getElementById('exportCsv');
const exportPdf=document.getElementById('exportPdf');
const infoBtn=document.getElementById('infoBtn');
const infoModal=document.getElementById('infoModal');
const closeInfo=document.getElementById('closeInfo');
const factBox=document.getElementById('factBox');
const lockBtn=document.getElementById('lockBtn');
const pinModal=document.getElementById('pinModal'); const pinInput=document.getElementById('pinInput');
const pinSetBtn=document.getElementById('pinSet'); const pinCheckBtn=document.getElementById('pinCheck');

let chart;

// storage helpers
const load=()=>{ try{return JSON.parse(localStorage.getItem(storageKey)||'[]')}catch{return []} };
const save=(l)=> localStorage.setItem(storageKey, JSON.stringify(l));

// pin
const hasPin=()=>!!localStorage.getItem(pinKey);
const setPin=(v)=>localStorage.setItem(pinKey,v);
const checkPin=(v)=>localStorage.getItem(pinKey)===v;

// info & pin handlers
infoBtn.addEventListener('click',()=>infoModal.showModal());
closeInfo.addEventListener('click',()=>infoModal.close());

lockBtn.addEventListener('click',()=>{pinInput.value='';pinModal.showModal()});
pinSetBtn.addEventListener('click',e=>{e.preventDefault();const v=pinInput.value.trim();if(!v)return;setPin(v);pinModal.close();alert('PIN установлен')});
pinCheckBtn.addEventListener('click',e=>{e.preventDefault();if(hasPin()&&!checkPin(pinInput.value.trim()))return alert('Неверный PIN');pinModal.close()});

// facts
function renderFact(){ factBox.textContent = facts[Math.floor(Math.random()*facts.length)]; }

// filtering
function applyFilter(list){ const cat=filterCat.value; return cat==='all'?list:list.filter(x=>x.category===cat); }
filterCat.addEventListener('change',()=>renderAll());

// KPIs
function renderKPIs(list){
  const now=Date.now(), week=7*24*3600*1000;
  const f=applyFilter(list).filter(x=> now-x.ts<=week);
  const total=f.length;
  const prot=f.length?Math.round(100*f.filter(x=>x.protected).length/f.length):0;
  const orgasm=f.length?Math.round(100*f.filter(x=>x.orgasm).length/f.length):0;
  kpisEl.innerHTML=`
    <div class="kpi"><div class="num">${total}</div><div class="lbl">за 7 дней</div></div>
    <div class="kpi"><div class="num">${prot}%</div><div class="lbl">защита</div></div>
    <div class="kpi"><div class="num">${orgasm}%</div><div class="lbl">оргазм</div></div>
  `;
}

// chart
function buildChartData(list){
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()-i);
    days.push({label:d.toLocaleDateString(), start:d.getTime(), end:d.getTime()+86400000});
  }
  const f=applyFilter(list);
  return { labels: days.map(d=>d.label), counts: days.map(d=>f.filter(x=>x.ts>=d.start && x.ts<d.end).length) };
}
function renderChart(list){
  const {labels,counts}=buildChartData(list);
  const ctx=document.getElementById('chart');
  if(chart) chart.destroy();
  chart=new Chart(ctx,{
    type:'line',
    data:{ labels, datasets:[{ label:'События', data:counts, borderColor:'#e53935', backgroundColor:'rgba(229,57,53,.15)', fill:true, tension:.35 }]},
    options:{
      responsive:true,
      plugins:{ legend:{ display:false } },
      scales:{ x:{ grid:{ display:false } }, y:{ beginAtZero:true, ticks:{ precision:0 } } }
    }
  });
}

// history
function renderHistory(list){
  const data=applyFilter(list).sort((a,b)=>b.ts-a.ts);
  historyEl.innerHTML = data.map(e=>{
    const d=new Date(e.ts).toLocaleString();
    const safe=(s)=> (s||'').replace(/</g,'&lt;');
    const catLabel={sex:'Секс',masturbation:'Мастурбация',date:'Свидание',foreplay:'Прелюдия',other:'Другое'}[e.category]||e.category;
    return `<div class="hist">
      <div><b>${d}</b><div class="note">${safe(e.note)}</div></div>
      <div>${catLabel} • ${safe(e.mood)} ${e.protected?'• 🛡️':''} ${e.orgasm?'• ✨':''} ${e.partner? '• '+safe(e.partner):''}</div>
    </div>`;
  }).join('') || '<div class="muted">Пока пусто</div>';
}

// form submit
form.addEventListener('submit', (ev)=>{
  ev.preventDefault();
  const dt=document.getElementById('dt').value;
  if(!dt) return alert('Укажи дату/время');
  const payload={
    ts:new Date(dt).getTime(),
    category:document.getElementById('category').value,
    partner:document.getElementById('partner').value.trim(),
    mood:document.getElementById('mood').value,
    protected:document.getElementById('protected').checked,
    orgasm:document.getElementById('orgasm').checked,
    note:document.getElementById('note').value.trim()
  };
  const list=load(); list.push(payload); save(list);
  try{ tg?.sendData?.(JSON.stringify({ type:'event_add', payload })); }catch{}
  form.reset(); renderAll(); tg?.HapticFeedback?.notificationOccurred?.('success');
});

// clear
clearBtn.addEventListener('click', ()=>{
  if(!confirm('Удалить все записи?')) return;
  localStorage.removeItem(storageKey);
  renderAll();
});

// export
function toCSV(list){
  const header=['datetime','category','partner','mood','protected','orgasm','note'];
  const rows=list.map(e=>[
    new Date(e.ts).toISOString(),
    e.category,
    (e.partner||'').replace(/"/g,'""'),
    e.mood,
    e.protected?'yes':'no',
    e.orgasm?'yes':'no',
    (e.note||'').replace(/"/g,'""')
  ]);
  return [header,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
}
exportCsv.addEventListener('click', ()=>{
  const csv=toCSV(load());
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download='sexhealth_export.csv';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});
exportPdf.addEventListener('click', ()=>{
  const list=applyFilter(load());
  const { jsPDF } = window.jspdf; const doc=new jsPDF();
  doc.setFontSize(16); doc.text('Sex Health — Отчёт', 14, 18);
  doc.setFontSize(10); doc.text('Экспортировано: '+new Date().toLocaleString(), 14, 26);
  let y=36;
  list.slice(0,80).forEach(e=>{
    const line=`${new Date(e.ts).toLocaleString()} | ${e.category} | ${e.mood} ${e.protected?'• shield':''} ${e.orgasm?'• orgasm':''} ${e.partner? '• '+e.partner:''} ${e.note? '— '+e.note:''}`;
    if(y>280){ doc.addPage(); y=20; }
    doc.text(line, 14, y); y+=6;
  });
  doc.save('sexhealth_report.pdf');
});

function renderAll(){
  const list=load();
  renderKPIs(list);
  renderChart(list);
  renderHistory(list);
  renderFact();
}

// init
renderAll();
