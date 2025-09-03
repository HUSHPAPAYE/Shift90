// --- data layer ---
const K="shift90_pro_v1";
const POLES=["Travail","Learning","Santé","Artistique"];
const TODAY = new Date().toISOString().slice(0,10);

const el = q=>document.querySelector(q);
const els = q=>[...document.querySelectorAll(q)];

const load =()=>{ try{return JSON.parse(localStorage.getItem(K))||{} }catch{ return {} } };
const save =s=>localStorage.setItem(K, JSON.stringify(s));

function blankDay(){
  return {
    moments:{morning:mBlank(),noon:mBlank(),evening:mBlank()},
    scores:{}, energy:0, tags:[], note:""
  };
}
const mBlank =()=>({note:"",tags:[], vals:{Travail:0,Learning:0,Santé:0,Artistique:0}});

function ensure(state){
  state.v ??= 1;
  state.phases ??= [{id:"P1",start:TODAY}];
  state.days ??= {};
  state.days[TODAY] ??= blankDay();
  return state;
}

function scoreDay(day){
  const v = POLES.map(p=>Number(day.moments.morning.vals[p]
    + day.moments.noon.vals[p]
    + day.moments.evening.vals[p]) / 3);
  const m = v.reduce((a,b)=>a+b,0)/POLES.length;
  return Math.round(m*100);
}

function recompute(state){
  const keys = Object.keys(state.days).sort();
  let E=0, prev=null;
  for(const d of keys){
    const day = state.days[d];
    day._score = scoreDay(day);
    if(prev){ const delta=(new Date(d)-new Date(prev))/86400000; E *= Math.pow(0.97, delta); }
    E += day._score; day.energy = Math.round(E); prev=d;
  }
  state._streak = (()=>{ let k=0; for(let i=keys.length-1;i>=0;i--){ if(state.days[keys[i]]._score>=60) k++; else break; } return k; })();
}

function ema(arr,k){ const a=2/(k+1); let e=null; return arr.map(v=> (e==null? e=v : e=a*v+(1-a)*e, e)); }
function variance(arr){ const m=arr.reduce((a,b)=>a+b,0)/arr.length; return Math.round(arr.reduce((s,x)=>s+(x-m)**2,0)/arr.length); }

// --- UI state ---
let S = ensure(load()); recompute(S); save(S);
el('#dayLabel').textContent = TODAY;
el('#phase').textContent = S.phases.at(-1)?.id ?? "";

// tabs
els('.tab').forEach(t=>t.onclick=()=>{
  els('.tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
  els('.view').forEach(v=>v.classList.remove('active'));
  el('#view-'+t.dataset.view).classList.add('active');
  if (t.dataset.view==='week') renderWeek();
  if (t.dataset.view==='phase') renderPhase();
  if (t.dataset.view==='data') {} // noop
});

// moments pills
let currentM='morning';
els('.pill').forEach(p=>p.onclick=()=>{
  els('.pill').forEach(x=>x.classList.remove('active')); p.classList.add('active');
  currentM = p.dataset.m; renderMoment();
});

function renderMoment(){
  const M = S.days[TODAY].moments[currentM];
  const box = el('#sliders'); box.innerHTML='';
  POLES.forEach(p=>{
    const val = M.vals[p] ?? 0;
    const id=`r_${p}`;
    box.insertAdjacentHTML('beforeend',
      `<label>${p}<input id="${id}" type="range" min="0" max="1" step="0.1" value="${val}"><span>${val}</span></label>`);
    const inp = el('#'+id), span = inp.nextElementSibling;
    inp.oninput = e=> span.textContent = e.target.value;
  });
  el('#note').value = M.note || "";
  el('#tags').value = (M.tags||[]).join(', ');
  updateHeader();
}
renderMoment();

function persistMoment(){
  const M = S.days[TODAY].moments[currentM];
  POLES.forEach(p=> M.vals[p] = Number(el('#r_'+p).value));
  M.note = el('#note').value.slice(0,800);
  M.tags = el('#tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  recompute(S); save(S); updateHeader();
  el('#hint').textContent = "Enregistré.";
}
el('#saveMoment').onclick = persistMoment;

function updateHeader(){
  const D = S.days[TODAY];
  el('#score').textContent = (D._score ?? 0) + "%";
  el('#streak').textContent = S._streak ?? 0;
  el('#energy').textContent = D.energy ?? 0;
}
updateHeader();

// reminders
(function(){
  S.reminders ??= {morning:"08:30",noon:"14:00",evening:"21:30"};
  el('#r_m').value = S.reminders.morning;
  el('#r_n').value = S.reminders.noon;
  el('#r_e').value = S.reminders.evening;
  el('#saveRem').onclick = ()=>{
    S.reminders = {morning:el('#r_m').value,noon:el('#r_n').value,evening:el('#r_e').value};
    save(S); alert("Rappels enregistrés localement.");
  };
})();

// week view
function renderWeek(){
  const div = el('#heatmap'); div.innerHTML='';
  const keys = Object.keys(S.days).sort().slice(-7);
  const vals = keys.map(k=> S.days[k]._score ?? 0);
  const buckets = vals.map(v=> v>=90?5:v>=75?4:v>=60?3:v>=30?2:v>0?1:0);
  for (let i=0;i<7;i++){
    const c = document.createElement('div'); c.className='cell'; c.dataset.v=buckets[i]||0; div.appendChild(c);
  }
  // ema / var
  const ema7 = Math.round((ema(vals,7).at(-1)||0));
  el('#ema7').textContent = (isFinite(ema7)?ema7:0) + "%";
  el('#var7').textContent = (vals.length?variance(vals):0);
}

// phase view (simple canvas)
function renderPhase(){
  const cvs = el('#chart'); const ctx = cvs.getContext('2d');
  const keys = Object.keys(S.days).sort();
  const vals = keys.map(k=> S.days[k]._score ?? 0);
  const ema28 = ema(vals,28);
  ctx.clearRect(0,0,cvs.width,cvs.height);
  const W=cvs.width,H=cvs.height; const n=vals.length||1;
  const x=i=> (i/(n-1||1))*W; const y=v=> H - (v/100)*H;
  ctx.lineWidth=2;
  // base series
  ctx.beginPath();
  vals.forEach((v,i)=>{ const px=x(i), py=y(v); i?ctx.lineTo(px,py):ctx.moveTo(px,py); });
  ctx.strokeStyle="#2c7ab0"; ctx.stroke();
  // ema
  ctx.beginPath();
  ema28.forEach((v,i)=>{ const px=x(i), py=y(v||0); i?ctx.lineTo(px,py):ctx.moveTo(px,py); });
  ctx.strokeStyle="#5ad1ff"; ctx.stroke();
}

// data view
el('#exportJson').onclick = ()=>{
  const blob = new Blob([JSON.stringify(S,null,2)],{type:"application/json"});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download="shift90.json"; a.click();
};
el('#exportCsv').onclick = ()=>{
  const keys = Object.keys(S.days).sort();
  const rows = [["date","score","energy","m_morning","m_noon","m_evening","note_len","tags"]];
  keys.forEach(k=>{
    const d=S.days[k];
    rows.push([
      k, d._score||0, d.energy||0,
      Object.values(d.moments.morning.vals).join('|'),
      Object.values(d.moments.noon.vals).join('|'),
      Object.values(d.moments.evening.vals).join('|'),
      (d.moments.morning.note+d.moments.noon.note+d.moments.evening.note).length,
      [...new Set([...(d.moments.morning.tags||[]),...(d.moments.noon.tags||[]),...(d.moments.evening.tags||[])])].join('|')
    ]);
  });
  const csv = rows.map(r=>r.map(x=>String(x).replace(/"/g,'""')).map(x=>`"${x}"`).join(',')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"})); a.download="shift90.csv"; a.click();
};
el('#resetApp').onclick = ()=>{ if(confirm("Réinitialiser les données locales ?")){ localStorage.removeItem(K); location.reload(); } };
