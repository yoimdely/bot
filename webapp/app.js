
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
console.log("v4.2 app ready");
