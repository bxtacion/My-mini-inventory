// ------- Mini Inventory shared state (localStorage) -------
const KEY = 'mini_inventory_v1';
const $ = (sel, el=document) => el.querySelector(sel);
const $$ = (sel, el=document) => [...el.querySelectorAll(sel)];

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)) || []; }catch{ return []; } }
function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

export function getItems(){ return load(); }
export function upsert(item){
  const items = load();
  const i = items.findIndex(x=>x.id===item.id);
  if(i>=0) items[i] = item; else items.push(item);
  save(items);
}
export function remove(id){
  const items = load().filter(x=>x.id!==id);
  save(items);
}
export function exportJson(){
  const blob = new Blob([JSON.stringify(load(), null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'inventory.json'; a.click();
}
export function importJson(file, cb){
  const reader = new FileReader();
  reader.onload = () => { try{ localStorage.setItem(KEY, reader.result); cb && cb(true); }catch{ cb && cb(false); } };
  reader.readAsText(file);
}
export function byLowStock(threshold=5){ return load().filter(x=>Number(x.qty)<=Number(x.threshold||threshold)); }
export function totalCount(){ return load().length; }
export function totalQty(){ return load().reduce((s,x)=>s+Number(x.qty||0),0); }
export function reset(){ localStorage.removeItem(KEY); }
export function newItem(){ return {id:uid(), name:'', sku:'', qty:0, price:0, category:'', threshold:5}; }

// Small helper to set active nav link
export function setActive(page){
  $$('.nav a').forEach(a=>{ if(a.dataset.page===page) a.classList.add('active'); else a.classList.remove('active'); });
}