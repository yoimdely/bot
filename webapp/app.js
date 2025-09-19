
const tabs = document.querySelectorAll('.tab');
const btabs = document.querySelectorAll('.btab');
const panels = document.querySelectorAll('.panel');
function switchTab(name){
  tabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  btabs.forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  panels.forEach(p=>p.classList.toggle('active',p.id==='tab-'+name));
}
tabs.forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));
btabs.forEach(t=>t.addEventListener('click',()=>switchTab(t.dataset.tab)));

const form = document.getElementById('eventForm');
const historyDiv = document.getElementById('history');
const kpiTotal = document.getElementById('kpi-total');
const kpiProt = document.getElementById('kpi-prot');
const kpiOrg = document.getElementById('kpi-org');
const toast = document.getElementById('toast');

let events = JSON.parse(localStorage.getItem('events')||'[]');

function renderHistory(){
  historyDiv.innerHTML = '';
  events.forEach(ev=>{
    const div=document.createElement('div');
    div.className='item';
    div.innerHTML=`<div><b>${ev.icon}</b> ${ev.category} ${ev.partner?'- '+ev.partner:''}</div>
                   <div class="meta">${new Date(ev.dt).toLocaleString()} | ${ev.mood} ${ev.protected?'🛡️':''} ${ev.orgasm?'💥':''}</div>
                   <div>${ev.note||''}</div>`;
    historyDiv.prepend(div);
  });
}
function updateKpis(){
  let last7=events.filter(e=>Date.now()-new Date(e.dt).getTime()<7*24*60*60*1000);
  kpiTotal.textContent=last7.length;
  if(last7.length>0){
    let prot=last7.filter(e=>e.protected).length/last7.length*100;
    let org=last7.filter(e=>e.orgasm).length/last7.length*100;
    kpiProt.textContent=Math.round(prot)+'%';
    kpiOrg.textContent=Math.round(org)+'%';
  } else {
    kpiProt.textContent='0%';
    kpiOrg.textContent='0%';
  }
}

form.addEventListener('submit',e=>{
  e.preventDefault();
  const ev={
    dt:document.getElementById('dt').value,
    category:document.getElementById('category').options[document.getElementById('category').selectedIndex].text,
    partner:document.getElementById('partner').value,
    mood:document.getElementById('mood').value,
    protected:document.getElementById('protected').checked,
    orgasm:document.getElementById('orgasm').checked,
    note:document.getElementById('note').value,
    icon:document.getElementById('category').options[document.getElementById('category').selectedIndex].text.split(' ')[0]
  };
  events.push(ev);
  localStorage.setItem('events',JSON.stringify(events));
  renderHistory();
  updateKpis();
  toast.classList.add('show');
  setTimeout(()=>toast.classList.remove('show'),2000);
  form.reset();
});

document.getElementById('clearAll').addEventListener('click',()=>form.reset());

renderHistory();
updateKpis();
console.log("v4.4 app ready");
