export function scoreDay(day, poles){
  const vals = poles.map(p=> Number(day.scores?.[p] ?? 0));
  return Math.round(100 * vals.reduce((a,b)=>a+b,0) / poles.length);
}
export function ema(series, k){ // k=7,28
  const a = 2/(k+1); let ema=null; return series.map(v=> (ema==null? (ema=v):(ema=a*v+(1-a)*ema), ema));
}
export function energyWeighted(daysMap){
  const keys = Object.keys(daysMap).sort();
  let e=0, prev=null;
  for(const d of keys){
    const s = (daysMap[d]._score ?? 0);
    if(prev){ const delta=(new Date(d)-new Date(prev))/86400000; e *= Math.pow(0.97, delta) }
    e += s; daysMap[d]._energy=e; prev=d;
  }
  return e;
}
export function streak(daysMap){
  const keys = Object.keys(daysMap).sort().reverse();
  let k=0;
  for(const d of keys){
    const s = daysMap[d]._score ?? 0;
    if(s>=60) k++; else break;
  }
  return k;
}
