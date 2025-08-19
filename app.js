
// Mini Inventory - shared state
const KEY='mini_inventory_v2';
const $=sel=>document.querySelector(sel);
const $$=sel=>Array.from(document.querySelectorAll(sel));
const state={items:load()};

function load(){
  try{return JSON.parse(localStorage.getItem(KEY))||[]}catch(_){return []}
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state.items)); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
function currency(v){ if(v==null||v==='') return '-'; return Number(v).toLocaleString(undefined,{minimumFractionDigits:0}); }

function upsert(item){
  const i = state.items.findIndex(x=>x.id===item.id);
  if(i>=0) state.items[i]=item; else state.items.push(item);
  save(); 
}
function remove(id){ state.items = state.items.filter(x=>x.id!==id); save(); }

// ---------- Page initializers ---------- //
document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page || 'dashboard';
  if(page==='dashboard') initDashboard();
  if(page==='products') initProducts();
  if(page==='stock') initStock();
});

function navActive(){
  const here = document.body.dataset.page;
  $$('nav a').forEach(a=>{
    const p = a.getAttribute('data-page');
    if(p===here) a.classList.add('active');
  });
}

function initDashboard(){
  navActive();
  const totalItems = state.items.length;
  const totalQty = state.items.reduce((s,x)=>s+Number(x.qty||0),0);
  const lows = state.items.filter(x=> Number(x.qty||0) <= Number(x.threshold||0));

  $('#c-total-items').textContent=totalItems;
  $('#c-total-qty').textContent=currency(totalQty);
  $('#c-low').textContent=lows.length;

  const tbody = $('#t-recent');
  if(state.items.length===0){
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No items yet. Add some in <a href="products.html">Products</a>.</td></tr>';
  }else{
    const last = [...state.items].slice(-5).reverse();
    tbody.innerHTML = last.map(x=>`
      <tr>
        <td>${x.name}</td>
        <td>${x.sku||'-'}</td>
        <td>${currency(x.qty)}</td>
        <td>${currency(x.price)}</td>
        <td>${currency((x.qty||0)*(x.price||0))}</td>
      </tr>
    `).join('');
  }
}

function initProducts(){
  navActive();
  const form = $('#f-product');
  const tbody = $('#t-products');
  const search = $('#q');
  const sort = $('#sort');

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const formData = new FormData(form);
    const obj = Object.fromEntries(formData.entries());
    const item = {
      id: obj.id || uid(),
      name: obj.name.trim(),
      sku: obj.sku.trim(),
      qty: Number(obj.qty||0),
      price: Number(obj.price||0),
      threshold: Number(obj.threshold||0)
    };
    upsert(item);
    form.reset(); $('#id').value='';
    render();
  });

  $('#btn-reset').onclick = ()=>{ form.reset(); $('#id').value=''; };

  function render(){
    let q = (search.value||'').toLowerCase();
    let rows = state.items.filter(x=> [x.name,x.sku].join(' ').toLowerCase().includes(q));

    if(sort.value==='name') rows.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort.value==='qty') rows.sort((a,b)=>a.qty-b.qty);
    if(sort.value==='price') rows.sort((a,b)=>a.price-b.price);

    if(rows.length===0){
      tbody.innerHTML='<tr><td colspan="7" class="muted">No items. Add first!</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(x=>`
      <tr>
        <td>${x.name}</td>
        <td>${x.sku||'-'}</td>
        <td>${currency(x.qty)}</td>
        <td>${currency(x.price)}</td>
        <td>${currency(x.qty * x.price)}</td>
        <td>${currency(x.threshold)}</td>
        <td style="white-space:nowrap">
          <button class="secondary" data-edit="${x.id}">Edit</button>
          <button class="danger" data-del="${x.id}">Del</button>
        </td>
      </tr>
    `).join('');
  }

  tbody.addEventListener('click', e=>{
    const id = e.target.getAttribute('data-edit');
    if(id){
      const it = state.items.find(x=>x.id===id);
      if(it){
        ['id','name','sku','qty','price','threshold'].forEach(k=>{ $('#'+k).value = it[k] ?? ''; });
        window.scrollTo({top:0,behavior:'smooth'});
      }
    }
    const del = e.target.getAttribute('data-del');
    if(del && confirm('Delete this item?')){
      remove(del); render();
    }
  });

  search.addEventListener('input', render);
  sort.addEventListener('change', render);

  // import / export
  $('#btn-export').onclick = ()=>{
    const blob = new Blob([JSON.stringify(state.items,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#file-import').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      try{
        const arr = JSON.parse(ev.target.result);
        if(Array.isArray(arr)){ state.items = arr; save(); render(); alert('Imported '+arr.length+' items'); }
      }catch(err){ alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  });

  render();
}

function initStock(){
  navActive();
  const lowTbody = $('#t-low');
  const allTbody = $('#t-all');

  function render(){
    const lows = state.items.filter(x => Number(x.qty||0) <= Number(x.threshold||0));
    const all = state.items;
    lowTbody.innerHTML = (lows.length? lows: [{_empty:true}]).map(x=> x._empty ?
      `<tr><td colspan="4" class="muted">No low stock items.</td></tr>` :
      `<tr>
        <td><span class="badge danger">LOW</span> ${x.name}</td>
        <td>${currency(x.qty)}</td>
        <td>${currency(x.threshold)}</td>
        <td>${x.sku||'-'}</td>
      </tr>`).join('');

    allTbody.innerHTML = (all.length? all: [{_empty:true}]).map(x=> x._empty ?
      `<tr><td colspan="4" class="muted">No items yet. Please add products on the <a href="products.html">Products</a> page.</td></tr>` :
      `<tr>
        <td>${x.name}</td>
        <td>${x.sku||'-'}</td>
        <td>${currency(x.qty)}</td>
        <td>${currency(x.price)}</td>
      </tr>`).join('');
  }

  $('#btn-clear').onclick = ()=>{
    if(confirm('Clear ALL data?')){ state.items=[]; save(); render(); }
  };

  // export/import here as well
  $('#btn-export').onclick = ()=>{
    const blob = new Blob([JSON.stringify(state.items,null,2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'inventory.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#file-import').addEventListener('change', e=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ev=>{
      try{
        const arr = JSON.parse(ev.target.result);
        if(Array.isArray(arr)){ state.items = arr; save(); render(); alert('Imported '+arr.length+' items'); }
      }catch(err){ alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  });

  render();
}
