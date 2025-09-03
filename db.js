const KEY="shift90_store";
export function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{} }catch{ return {} } }
export function save(s){ localStorage.setItem(KEY, JSON.stringify(s)) }
export function migrate(s){
  if(!s.v){ s={v:2,poles:["Travail","Learning","Santé","Artistique"],phases:[{id:"P1"}],experiments:[],days:s.days||{}} }
  if(s.v<2){ s.v=2 }
  return s
}
export function ensureDay(s, d){ s.days[d]??={moment:{morning:{},noon:{},evening:{}},scores:{},energy:0,tags:[],events:[],note:""}; return s.days[d] }
