/* stock.js — inventory: summary, filters, stock in / out / count, movement history, low-stock alerts */
(function(){
'use strict';
const B=(a,e)=>uiLang==='en'?e:a;
const r2=x=>Math.round((Number(x)||0)*100)/100;
const canWrite=()=>{try{return operationsWrite()}catch(e){return false}};
let flt='all',q='';

const REASONS={
  in:[['supply','توريد جديد','New supply'],['return','إرجاع من زبون','Customer return'],['found','فرق جرد (زيادة)','Count surplus']],
  out:[['damage','تلف أو كسر','Damaged'],['own','استهلاك شخصي أو داخلي','Own use'],['loss','ضياع أو سرقة','Lost / stolen'],['supplier','إرجاع للمورّد','Returned to supplier'],['gift','هدية أو عينة','Gift / sample']],
  count:[['count','جرد فعلي','Physical count']]
};
const REASON_LABEL=k=>{for(const g of Object.values(REASONS)){const r=g.find(x=>x[0]===k);if(r)return B(r[1],r[2])}return k||''};
const low=x=>num(x.minStock)>0&&num(x.stock)<=num(x.minStock);
const out=x=>num(x.stock)<=0;

function stats(rows){
  let units=0,value=0,l=0,o=0;
  rows.forEach(x=>{const s=Math.max(0,num(x.stock));units+=s;value+=s*(num(x.cost)||0);if(out(x))o++;else if(low(x))l++});
  return{n:rows.length,units:r2(units),value:r2(value),low:l,out:o};
}

/* ---------- catalog page enhancement ---------- */
const _rc=renderCatalog;
renderCatalog=function(){
  let h=_rc();
  const rows=liveDocs('catalog'),auto=pref().inventoryMode==='auto',s=stats(rows);
  const banner=auto?'':`<div class="notice" style="margin-bottom:12px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span style="flex:1;min-width:200px">${B('تتبّع المخزون متوقف: لن تتغير الكميات عند التوريد والبيع.','Stock tracking is off: quantities will not change on purchases and sales.')}</span><button type="button" class="btn btn-primary btn-small" data-st="enable">${B('فعّل التتبّع التلقائي','Turn on tracking')}</button></div>`;
  const tile=(l,v,c)=>`<div class="stat-tile"><span>${l}</span><strong ${c?`style="color:var(--${c})"`:''}>${v}</strong></div>`;
  const chip=(k,l)=>`<button type="button" class="filter-chip ${flt===k?'active':''}" data-st-f="${k}">${l}</button>`;
  const strip=`<div id="st-kpis" class="stat-grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr));margin-bottom:12px">${tile(B('عدد الأصناف','Items'),s.n)}${tile(B('مجموع الوحدات','Total units'),s.units)}${tile(B('قيمة المخزون (بالتكلفة)','Stock value (cost)'),money(s.value))}${tile(B('تنبيهات','Alerts'),`${s.low+s.out}`,s.low+s.out?'neg':'')}</div>
<div class="toolbar" id="st-tools"><div class="toolbar-left">${chip('all',B('الكل','All'))}${chip('low',B('منخفض','Low')+(s.low?` (${s.low})`:''))}${chip('out',B('نافد','Out')+(s.out?` (${s.out})`:''))}</div><div class="toolbar-right"><input id="st-q" class="control" type="search" placeholder="${B('بحث في الأصناف','Search items')}" value="${esc(q)}" style="min-width:170px"></div></div>`;
  const i=h.indexOf('<div class="content-grid">');
  h=i>0?h.slice(0,i)+banner+(rows.length?strip:'')+h.slice(i):banner+h;
  if(canWrite()&&auto){
    h=h.replace(/<button class="icon-action-sm" data-action="edit-catalog" data-id="([^"]+)">/g,(m,id)=>`<button class="icon-action-sm" data-st="in" data-id="${id}">＋ ${B('توريد','Stock in')}</button><button class="icon-action-sm" data-st="out" data-id="${id}">− ${B('صرف','Out')}</button><button class="icon-action-sm" data-st="count" data-id="${id}">${B('جرد','Count')}</button><button class="icon-action-sm" data-st="hist" data-id="${id}">${B('السجل','History')}</button>`+m);
  }else{
    h=h.replace(/<button class="icon-action-sm" data-action="edit-catalog" data-id="([^"]+)">/g,(m,id)=>`<button class="icon-action-sm" data-st="hist" data-id="${id}">${B('السجل','History')}</button>`+m);
  }
  return h;
};
function applyFilter(){
  const cards=document.querySelectorAll('#page-view .record-card');if(!cards.length||!document.getElementById('st-tools'))return;
  const needle=q.trim().toLowerCase();
  cards.forEach(c=>{
    const b=c.querySelector('[data-st="hist"]');if(!b)return;
    const it=docById('catalog',b.dataset.id);if(!it)return;
    const okF=flt==='all'||(flt==='out'&&out(it))||(flt==='low'&&!out(it)&&low(it));
    const okQ=!needle||(String(it.name||'')+' '+String(it.sku||'')).toLowerCase().includes(needle);
    c.style.display=okF&&okQ?'':'none';
    c.classList.toggle('st-low',low(it)||out(it));
  });
}
const _render=render;render=function(){_render();applyFilter()};

/* ---------- dashboard alert ---------- */
const _rd=renderDashboard;
renderDashboard=function(){
  const h=_rd();
  if(pref().inventoryMode!=='auto')return h;
  const al=liveDocs('catalog').filter(x=>low(x)||out(x)).sort((a,b)=>num(a.stock)-num(b.stock));
  if(!al.length)return h;
  const rows=al.slice(0,5).map(x=>`<div class="list-row"><div class="row-icon">▦</div><div class="row-main"><strong>${esc(x.name)}</strong><small>${B('الحد','Min')}: ${esc(x.minStock||0)} ${esc(x.unit||'')}</small></div><div class="row-value ${out(x)?'amount-negative':''}">${esc(num(x.stock))} ${esc(x.unit||'')}</div></div>`).join('');
  return h+`<div class="stack" style="margin-top:14px">${panel(B('تنبيه المخزون','Stock alert'),`<div class="list">${rows}</div><div style="margin-top:10px"><button type="button" class="btn btn-outline btn-small" data-page="catalog">${B('افتح المخزون','Open stock')}</button></div>`)}</div>`;
};

/* ---------- modals ---------- */
function modal(html){const m=document.getElementById('modal-root');m.innerHTML=html;m.hidden=false}
function openAdjust(id,mode){
  const it=docById('catalog',id);if(!it)return;
  const T={in:B('توريد إلى المخزون','Stock in'),out:B('صرف من المخزون','Stock out'),count:B('جرد: ضبط الكمية الفعلية','Stock count')}[mode];
  const rs=REASONS[mode].map(r=>`<option value="${r[0]}">${B(r[1],r[2])}</option>`).join('');
  modal(`<div class="modal-card" role="dialog" aria-modal="true" aria-label="${esc(T)}"><div class="modal-head"><div><h2>${esc(T)}</h2><p>${esc(it.name)} · ${B('الحالي','Current')}: <b>${esc(num(it.stock))}</b> ${esc(it.unit||'')}</p></div><button class="icon-button" data-action="modal-close" type="button">×</button></div>
<form data-stform="${mode}" data-id="${esc(id)}"><div class="form-grid">
<label class="field"><span>${mode==='count'?B('الكمية الفعلية الآن','Actual quantity now'):B('الكمية','Quantity')}</span><input name="qty" class="control" type="number" min="0" step="any" inputmode="decimal" required ${mode==='count'?`value="${esc(num(it.stock))}"`:''} autocomplete="off"></label>
${mode==='in'?`<label class="field"><span>${B('تكلفة الوحدة (اختياري)','Unit cost (optional)')}</span><input name="unitCost" class="control" type="number" min="0" step="any" inputmode="decimal" placeholder="${it.cost!==''&&it.cost!==undefined?esc(it.cost):'0'}" autocomplete="off"></label>`:''}
<label class="field"><span>${B('السبب','Reason')}</span><select name="reason" class="control">${rs}</select></label>
<label class="field"><span>${B('ملاحظة','Note')}</span><input name="note" class="control" autocomplete="off"></label></div>
<div id="st-prev" class="px-hint" style="margin-top:10px"></div><div id="st-err" class="form-error" role="alert"></div>
<div class="form-footer"><span></span><button class="btn btn-primary" type="submit">${B('حفظ','Save')}</button></div></form></div>`);
  const f=document.querySelector('form[data-stform]');updPrev(f);
  setTimeout(()=>{const i=f.elements.qty;if(i){i.focus();if(mode==='count')i.select()}},60);
}
function newStock(f,it){
  const mode=f.dataset.stform,v=num(f.elements.qty.value),cur=num(it.stock);
  return mode==='in'?cur+v:mode==='out'?cur-v:v;
}
function updPrev(f){
  if(!f)return;const it=docById('catalog',f.dataset.id);if(!it)return;
  const n=newStock(f,it),p=document.getElementById('st-prev');
  if(p)p.textContent=`${B('الرصيد بعد العملية','Balance after')}: ${r2(n)} ${it.unit||''}`;
}
function openHistory(id){
  const it=docById('catalog',id);if(!it)return;
  const ev=[];
  (it.log||[]).forEach(l=>ev.push({k:`${l.date||''} ${l.time||''}`,delta:num(l.delta),label:`${REASON_LABEL(l.reason)}${l.note?' — '+l.note:''}`,bal:l.balance}));
  liveDocs('records').forEach(r=>{if(r.inventoryItemId===id&&num(r.inventoryDelta))ev.push({k:`${r.date||''} ${r.time||''}`,delta:num(r.inventoryDelta),label:`${B('صفقة','Deal')} ${r.ref||''}${r.customer?' · '+r.customer:r.supplier?' · '+r.supplier:''}`})});
  ev.sort((a,b)=>b.k.localeCompare(a.k));
  const rows=ev.slice(0,80).map(e=>`<div class="list-row"><div class="row-main"><strong>${esc(e.label||'—')}</strong><small>${esc(e.k.trim())}</small></div><div class="row-value ${e.delta>=0?'amount-positive':'amount-negative'}" dir="ltr">${e.delta>0?'+':''}${r2(e.delta)}${e.bal!==undefined?` <small style="color:var(--muted)">→ ${r2(e.bal)}</small>`:''}</div></div>`).join('');
  modal(`<div class="modal-card" role="dialog" aria-modal="true"><div class="modal-head"><div><h2>${B('سجل حركة الصنف','Item movement')}</h2><p>${esc(it.name)} · ${B('الرصيد الحالي','Balance')}: <b>${esc(num(it.stock))}</b> ${esc(it.unit||'')}</p></div><button class="icon-button" data-action="modal-close" type="button">×</button></div>${rows?`<div class="list">${rows}</div>`:`<div class="empty-state"><strong>${B('لا حركة بعد','No movements yet')}</strong>${B('تظهر هنا التوريدات والمبيعات والتعديلات.','Supplies, sales and adjustments appear here.')}</div>`}</div>`);
}

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const f=e.target.closest&&e.target.closest('[data-st-f]');
  if(f){flt=f.dataset.stF;document.querySelectorAll('[data-st-f]').forEach(x=>x.classList.toggle('active',x===f));applyFilter();return}
  const b=e.target.closest&&e.target.closest('[data-st]');if(!b)return;
  const k=b.dataset.st;
  if(k==='enable'){
    if(!settingsWrite())return;
    state.prefs={...pref(),inventoryMode:'auto',_updatedAt:Date.now()};
    await commit({message:'تم تفعيل تتبع المخزون'});return;
  }
  if(k==='hist')openHistory(b.dataset.id);
  else if(canWrite())openAdjust(b.dataset.id,k);
});
document.addEventListener('input',e=>{
  if(e.target.id==='st-q'){q=e.target.value;applyFilter();return}
  const f=e.target.closest&&e.target.closest('form[data-stform]');if(f)updPrev(f);
});
document.addEventListener('submit',async e=>{
  const f=e.target.closest&&e.target.closest('form[data-stform]');if(!f)return;
  e.preventDefault();e.stopImmediatePropagation();
  const it=docById('catalog',f.dataset.id),mode=f.dataset.stform,err=document.getElementById('st-err');
  if(!it||!canWrite())return;
  const v=num(f.elements.qty.value);
  if(!(v>0)&&mode!=='count'){err.textContent=B('أدخل كمية أكبر من صفر','Enter a quantity above zero');return}
  if(mode==='count'&&f.elements.qty.value.trim()===''){err.textContent=B('أدخل الكمية الفعلية','Enter the actual quantity');return}
  const cur=num(it.stock),n=newStock(f,it);
  if(n<0){err.textContent=B(`الكمية أكبر من المتاح (${cur})`,`Quantity exceeds available stock (${cur})`);return}
  const delta=r2(n-cur),patch={stock:r2(n)};
  if(mode==='in'){
    const uc=num(f.elements.unitCost&&f.elements.unitCost.value);
    if(uc>0){const c0=num(it.cost),st=Math.max(0,cur),base=st>0&&c0>0?st:0;patch.cost=r2(((base>0?base*c0:0)+v*uc)/(base+v))}
  }
  const entry={id:uid('m'),date:today(),time:nowTime(),delta,reason:f.elements.reason.value,note:(f.elements.note.value||'').trim().slice(0,120),balance:r2(n)};
  patch.log=[entry,...(Array.isArray(it.log)?it.log:[])].slice(0,200);
  try{
    updateDoc('catalog',it.id,patch);
    closeModal();
    await commit({message:'تم تحديث المخزون'});
  }catch(er){toast(er.message||B('تعذر الحفظ','Could not save'),'error')}
},true);
})();
