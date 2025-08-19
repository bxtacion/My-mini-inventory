
// ===== Shared state (localStorage) =====
const KEY = 'mini_inventory_v2';
const $ = (sel, el=document)=>el.querySelector(sel);
const $$ = (sel, el=document)=>el.querySelectorAll(sel);

function load(){ try{ return JSON.parse(localStorage.getItem(KEY)||'[]') }catch{ return [] } }
function save(items){ localStorage.setItem(KEY, JSON.stringify(items)) }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6) }

export function getItems(){ return load() }
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
  a.download = 'inventory.json';
  a.click();
  URL.revokeObjectURL(a.href);
}
export function importJson(file, cb){
  const reader = new FileReader();
  reader.onload = () => { try{ localStorage.setItem(KEY, reader.result); cb && cb(true); }catch(e){ cb && cb(false) } }
  reader.readAsText(file);
}
export function byLowStock(threshold=5){ return load().filter(x=>Number(x.qty)<=Number(x.threshold||threshold)) }
export function totalCount(){ return load().length; }
export function totalQty(){ return load().reduce((s,x)=>s+Number(x.qty||0),0); }
export function reset(){ localStorage.removeItem(KEY); }
export function newItem(){ return {id:uid(), name:'', sku:'', qty:0, price:0, category:'', threshold:5}; }

// Small helper to set active nav link
export function setActive(page){
  $$('.nav a').forEach(a=>{ if(a.dataset.page===page) a.classList.add('active'); else a.classList.remove('active') });
}

// ===== Pages =====
(function init(){
  const page = document.body.dataset.page;
  setActive(page);

  if(page==='dashboard') initDashboard();
  if(page==='products')  initProducts();
  if(page==='stock')     initStock();
})();

function fmtMoney(v){ v=Number(v||0); return v ? v.toLocaleString(undefined,{style:'currency',currency:'THB',maximumFractionDigits:0}) : '–' }

// Dashboard
function initDashboard(){
  const items = getItems();
  $('#stat-products').textContent = items.length;
  $('#stat-totalqty').textContent = totalQty();
  $('#stat-low').textContent = byLowStock().length;

  const tbody = $('#tbl-recent tbody');
  tbody.innerHTML = items.slice(-6).reverse().map(x=>`<tr>
      <td>${escape(x.name)}</td>
      <td>${escape(x.sku)}</td>
      <td>${x.qty}</td>
      <td>${fmtMoney(x.price)}</td>
      <td>${fmtMoney(Number(x.price)*Number(x.qty||0))}</td>
  </tr>`).join('') || `<tr><td colspan="5" class="muted">No items yet…</td></tr>`;
}

// Products
function initProducts(){
  const form = $('#form');
  const inputs = ['name','sku','qty','price','category','threshold'].map(id=>$('#'+id));
  const search = $('#search');
  const sortSel = $('#sort');
  const empty = $('#empty');
  const tbody = $('#tbl tbody');

  function readForm(){
    const [name, sku, qty, price, category, threshold] = inputs.map(i=>i.value.trim());
    return {id: form.dataset.id || newItem().id, name, sku, qty:Number(qty||0), price:Number(price||0), category, threshold:Number(threshold||5)};
  }
  function fillForm(x){
    form.dataset.id = x.id;
    $('#name').value=x.name||''; $('#sku').value=x.sku||''; $('#qty').value=x.qty||0; $('#price').value=x.price||0;
    $('#category').value=x.category||''; $('#threshold').value=x.threshold||5;
  }

  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    upsert(readForm()); form.reset(); delete form.dataset.id; render();
  });
  $('#btn-reset').onclick = ()=>{ form.reset(); delete form.dataset.id; };
  $('#btn-export').onclick = exportJson;
  $('#file-import').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; importJson(f, ok=>{ if(ok){ render(); alert('Imported ✅'); } else alert('Invalid JSON'); }); });
  $('#btn-clear').onclick = ()=>{ if(confirm('Delete ALL items?')){ reset(); render(); } };
  search.addEventListener('input', render);
  sortSel.addEventListener('change', render);

  $('#tbl').addEventListener('click', (e)=>{
    const id = e.target.closest('tr')?.dataset.id; if(!id) return;
    if(e.target.matches('.btn-edit')){ const x = getItems().find(x=>x.id===id); fillForm(x); window.scrollTo({top:0,behavior:'smooth'}); }
    if(e.target.matches('.btn-del')){ if(confirm('Delete this item?')){ remove(id); render(); } }
  });

  function render(){
    const q = search.value.toLowerCase().trim();
    let arr = getItems().filter(x=> !q || x.name.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q) || (x.category||'').toLowerCase().includes(q) );
    const key = sortSel.value;
    arr.sort((a,b)=> (''+a[key]).localeCompare((''+b[key]), undefined, {numeric:true,sensitivity:'base'}));

    empty.hidden = arr.length>0;
    tbody.innerHTML = arr.map(x=>`<tr data-id="${x.id}">
      <td>${escape(x.name)}</td>
      <td class="muted">${escape(x.sku)}</td>
      <td>${x.qty}</td>
      <td>${fmtMoney(x.price)}</td>
      <td class="txt-right">
        <button class="btn outline btn-edit">Edit</button>
        <button class="btn danger outline btn-del">Delete</button>
      </td>
    </tr>`).join('');
  }
  render();
}

// Stock
function initStock(){
  const lowTbody = $('#tbl-low tbody');
  const allTbody = $('#tbl-all tbody');
  $('#btn-export').onclick = exportJson;
  $('#file-import').addEventListener('change', e=>{ const f=e.target.files[0]; if(!f) return; importJson(f, ok=>{ if(ok){ render(); alert('Imported ✅'); } else alert('Invalid JSON'); }); });
  function render(){
    const arr = getItems();
    const low = byLowStock();
    lowTbody.innerHTML = low.map(x=>`<tr><td>${escape(x.name)}</td><td>${x.qty}</td><td>${x.threshold||5}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">No low stock.</td></tr>`;
    allTbody.innerHTML = arr.map(x=>`<tr><td>${escape(x.name)}</td><td>${escape(x.sku)}</td><td>${x.qty}</td><td>${fmtMoney(x.price)}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">No items yet.</td></tr>`;
  }
  render();
}

// Helpers
function escape(s){ return (s??'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])) }
