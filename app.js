import {load,save,migrate,ensureDay} from './db.js';
import {scoreDay,ema,energyWeighted,streak} from './metrics.js';

const poles=["Travail","Learning","Santé","Artistique"];
const state = migrate(load()); save(state);

const today = new Date().toISOString().slice(0,10);
ensureDay(state, today); save(state);

// UI bindings
const el = s=>document.querySelector(s);
el('#dayLabel').textContent = today;

function renderDay(d){
  const day = ensureDay(state,d);
  // sliders 0..1 par pôle
  const box = el('#sliders'); box.innerHTML='';
  poles.forEach(p=>{
    const v = Number(day.scores?.[p] ?? 0);
    const id = `s_${p}`;
    box.insertAdjacentHTML('beforeend',
      `<label>${p}<input id="${id}" type="range" min="0" max="1" step="0.1" value="${v}"><span>${v}</span></label>`);
    const input = document.getElementById(id);
    const span = input.nextElementSibling;
    input.oninput = e=>{ span.textContent=e.target.value; }
    input.onchange = e=>{
      day.scores[p]=Number(e.target.value);
      day._score = scoreDay(day, poles);
      save(state); updateHeader();
    }
  });
  el('#tags').value = day.tags?.join(', ')||'';
  el('#note').value = day.note||'';
}

function updateHeader(){
  // pré-calcul global
  Object.keys(state.days).forEach(d=>{
    const day = state.days[d];
    day._score = scoreDay(day,poles);
  });
  energyWeighted(state.days);
  el('#score').textContent = state.days[today]._score + '%';
  el('#streak').textContent = streak(state.days);
}

el('#saveNote').onclick = ()=>{
  const day = state.days[today];
  day.tags = el('#tags').value.split(',').map(s=>s.trim()).filter(Boolean);
  day.note = el('#note').value;
  save(state); updateHeader(); el('#status').textContent='Enregistré';
};

renderDay(today); updateHeader();
