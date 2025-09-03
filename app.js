const POLes = ["Travail","Learning","Santé","Artistique"];
const K = "shift90_store_v1";

const todayStr = () => new Date().toISOString().slice(0,10);
const el = id => document.getElementById(id);
const qs = s => document.querySelector(s);
const qsa = s => [...document.querySelectorAll(s)];

function load() {
  try { return JSON.parse(localStorage.getItem(K)) || {}; }
  catch { return {}; }
}

function save(store) {
  localStorage.setItem(K, JSON.stringify(store));
}

function ensureStore() {
  const s = load();
  s.goals ??= {"Travail":1,"Learning":1,"Santé":1,"Artistique":1};
  s.reminders ??= {"morning":"08:30","noon":"14:00","evening":"21:30"};
  s.days ??= {};
  s.days[todayStr()] ??= {
    morning: blankMoment(), noon: blankMoment(), evening: blankMoment()
  };
  save(s); return s;
}

function blankMoment() {
  return { "Travail":false,"Learning":false,"Santé":false,"Artistique":false, note:"" };
}

function computeScore(day) {
  const all = ["morning","noon","evening"].flatMap(m => POLes.map(p => day[m][p]));
  const done = all.filter(Boolean).length;
  return Math.round(100*done/all.length);
}

function computeStreak(days) {
  let d = new Date(), streak=0;
  while (true) {
    const key = d.toISOString().slice(0,10);
    if (!days[key]) break;
    const sc = computeScore(days[key]);
    if (sc < 60) break; // seuil réussite du jour
    streak++; d.setDate(d.getDate()-1);
  }
  return streak;
}

function renderMoment(store, momentKey) {
  const day = store.days[todayStr()];
  const m = day[momentKey];
  const checks = el("checks");
  checks.innerHTML = "";
  POLes.forEach(p => {
    const id = `${momentKey}_${p}`;
    const lab = document.createElement("label");
    lab.innerHTML = `<input type="checkbox" id="${id}" ${m[p]?"checked":""}> ${p}`;
    checks.appendChild(lab);
    qs(`#${id}`).addEventListener("change", e => {
      m[p] = e.target.checked;
      save(store);
      updateHeader(store);
      el("status").textContent = "Enregistré.";
    });
  });
  el("note").value = m.note || "";
  el("saveBtn").onclick = () => {
    m.note = el("note").value.slice(0,400);
    save(store);
    updateHeader(store);
    el("status").textContent = "Moment validé.";
  };
}

function updateHeader(store) {
  const day = store.days[todayStr()];
  el("score").textContent = computeScore(day) + "%";
  el("streak").textContent = computeStreak(store.days);
}

function bindReminders(store) {
  el("r_m").value = store.reminders.morning;
  el("r_n").value = store.reminders.noon;
  el("r_e").value = store.reminders.evening;
  el("saveRem").onclick = () => {
    store.reminders = {
      morning: el("r_m").value, noon: el("r_n").value, evening: el("r_e").value
    };
    save(store);
    alert("Rappels enregistrés (locaux). iOS notifie seulement si l’app est ouverte.");
  };
}

(function init(){
  const store = ensureStore();
  el("dayLabel").textContent = todayStr();

  // tabs
  let current = "morning";
  qsa(".tab").forEach(t=>{
    t.onclick = () => {
      qsa(".tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      current = t.dataset.m;
      renderMoment(store, current);
    };
  });

  renderMoment(store, current);
  updateHeader(store);
  bindReminders(store);
})();
