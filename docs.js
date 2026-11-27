/* docs.js — in-app invoice/receipt/statement viewer (with close button), company legal identity, invoice numbering */
(function(){
'use strict';
const B=(a,e)=>uiLang==='en'?e:a;
const r2=x=>Math.round((Number(x)||0)*100)/100;
const LG=()=>(state.prefs&&state.prefs.legal)||{};
const SH=()=>(state.prefs&&state.prefs.shop)||{};
const FORMS=['SARL','SARL AU','SA','SNC','SCS','SCA',B('تعاونية','Cooperative'),B('أخرى','Other')];

/* ---------------- styles (shared by the viewer and downloaded files) ---------------- */
const PS_CSS=`
.ps{font:14px/1.7 system-ui,-apple-system,"Segoe UI",Tahoma,Arial,sans-serif;color:#1b302a;background:#fff;max-width:780px;margin:0 auto;padding:28px;border:1px solid #dce6df;border-radius:14px}
.ps *{box-sizing:border-box}
.ps-head{display:flex;justify-content:space-between;gap:18px;flex-wrap:wrap;border-bottom:2.5px solid #226a50;padding-bottom:16px}
.ps-co h1{font-size:21px;margin:0 0 4px}.ps-co h1 small{font-size:12px;font-weight:600;color:#5d6f67;margin-inline-start:6px}
.ps-co p{margin:0;color:#5d6f67;font-size:13px}
.ps-ids{display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:8px;font-size:12px;color:#33493f}.ps-ids b{color:#176548}
.ps-docno{text-align:end}.ps-docno h2{margin:0 0 6px;font-size:19px;color:#176548}
.ps-no small{display:block;color:#74847c;font-size:11px}.ps-no b{font-size:17px;letter-spacing:.02em}
.ps-date{margin-top:4px;color:#5d6f67;font-size:12px}
.ps-party{margin:16px 0;padding:11px 14px;background:#f4f8f5;border-radius:10px;display:flex;flex-wrap:wrap;gap:4px 18px;align-items:baseline}
.ps-party small{color:#74847c;font-size:11px}.ps-party b{font-size:15px}
.ps-table{width:100%;border-collapse:collapse;margin:8px 0}
.ps-table th{background:#176548;color:#fff;font-weight:600;font-size:12px;padding:8px 7px;text-align:start}
.ps-table td{padding:9px 7px;border-bottom:1px solid #e3eae5;text-align:start;vertical-align:top}
.ps-table td.n,.ps-table th.n{text-align:end;white-space:nowrap}
.ps-tot{margin:12px 0 0;margin-inline-start:auto;max-width:330px}
.ps-tot div{display:flex;justify-content:space-between;gap:12px;padding:6px 2px;border-bottom:1px dashed #d3dfd8}
.ps-tot .grand{font-size:17px;font-weight:800;color:#176548;border-bottom:2px solid #176548}
.ps-tot .due{font-weight:800;color:#a8433b}
.ps-sub{margin:18px 0 6px;font-size:13px;font-weight:700}
.ps-note{margin-top:14px;padding:10px 12px;border:1px solid #dce6df;border-radius:9px;font-size:13px}
.ps-sign{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:34px;text-align:center;font-size:12px;color:#5d6f67}
.ps-sign i{display:block;height:46px;border-bottom:1px solid #9fb0a7;margin-top:6px}
.ps-foot{margin-top:20px;padding-top:10px;border-top:1px solid #dce6df;font-size:12px;color:#5d6f67;text-align:center}
#px-doc{position:fixed;inset:0;z-index:110;display:flex;flex-direction:column}
#px-doc[hidden]{display:none}
.px-doc-back{position:absolute;inset:0;background:rgba(8,20,16,.6)}
.px-doc-wrap{position:relative;display:flex;flex-direction:column;width:min(100%,860px);height:100%;margin:0 auto;background:var(--paper,#eef2ef)}
.px-doc-bar{display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;background:var(--surface,#fff);border-bottom:1px solid var(--line,#dde6e0)}
.px-doc-bar strong{flex:1;font-size:.92rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.px-doc-x{flex:none;width:44px;height:44px;border-radius:12px;border:1px solid var(--line,#dde6e0);background:var(--surface-2,#f7faf8);color:var(--ink,#1b302a);font-size:1.4rem;line-height:1}
.px-doc-btn{flex:none;padding:9px 12px;border-radius:10px;border:1px solid var(--line-strong,#cfdcd4);background:var(--surface,#fff);color:var(--ink,#1b302a);font:inherit;font-size:.8rem;font-weight:700}
.px-doc-btn.pri{background:#14604c;border-color:#14604c;color:#fff}
.px-doc-scroll{flex:1;overflow:auto;padding:14px 10px calc(24px + env(safe-area-inset-bottom,0px));-webkit-overflow-scrolling:touch}
.px-doc-scroll .ps{box-shadow:0 6px 24px rgba(0,0,0,.12)}
@media(max-width:560px){.ps{padding:16px}.px-doc-btn span{display:none}.ps-sign{gap:14px}}
@media print{
  body>*:not(#px-doc){display:none!important}
  #px-doc{position:static!important;display:block!important}
  .px-doc-back,.px-doc-bar{display:none!important}
  .px-doc-wrap{width:auto!important;height:auto!important;background:#fff!important}
  .px-doc-scroll{overflow:visible!important;padding:0!important}
  .px-doc-scroll .ps{border:0!important;box-shadow:none!important;max-width:none!important;border-radius:0!important;padding:0!important}
}`;
(function(){const s=document.createElement('style');s.id='px-ps-css';s.textContent=PS_CSS;document.head.appendChild(s)})();

/* ---------------- numbering ---------------- */
async function ensureInvoiceNo(r){
  if(r.invoiceNo)return r.invoiceNo;
  const lg=LG(),prefix=((lg.invoicePrefix||'F')+'').trim()||'F',yr=new Date().getFullYear();
  const seq={...(state.prefs.invoiceSeq||{})},start=Math.max(1,num(lg.invoiceStart)||1);
  let n=Math.max(num(seq[yr]),start-1)+1;seq[yr]=n;
  const no=`${prefix}-${yr}-${String(n).padStart(4,'0')}`;
  try{
    if(!writable())return no;
    state.prefs={...state.prefs,invoiceSeq:seq,_updatedAt:Date.now()};
    updateDoc('records',r.id,{invoiceNo:no});
    await commit({message:'تم إصدار رقم فاتورة'});
  }catch(e){}
  return no;
}

/* ---------------- document model ---------------- */
function build(r){
  const kind=r.kind,sale=['deal','buy'].includes(kind),rep=['repair','rep'].includes(kind),debt=kind==='debt',vch=['voucher','vch'].includes(kind);
  const note=r.note||r.fault||'',payments=Array.isArray(r.payments)?r.payments:[];
  if(sale){
    const s=num(r.sale??r.sell),b=num(r.purchase??r.buy),q=num(r.qty)||1;
    if(s>0)return{type:'invoice',title:B('فاتورة بيع','Sales invoice'),r,numbered:true,party:{l:B('الزبون','Customer'),n:r.customer||r.cn||'',p:r.customerPhone||r.cp||''},lines:[{d:r.item,q,u:s/q,t:s}],total:s,paid:num(r.received??r.recv),method:r.method,note,payments,vat:true,contract:true};
    return{type:'purchase',title:B('وصل شراء','Purchase receipt'),r,party:{l:B('المورّد','Supplier'),n:r.supplier||r.sn||'',p:r.supplierPhone||r.sp||''},lines:[{d:r.item,q,u:b/q,t:b}],total:b,paid:num(r.paid),method:r.method,note,payments,extra:r.supplierInvoice?[B('رقم فاتورة المورد','Supplier invoice no.'),r.supplierInvoice]:null,contract:true};
  }
  if(rep){
    const c=num(r.charge??r.price);
    return{type:'repair',title:B('فاتورة إصلاح','Repair invoice'),r,numbered:true,party:{l:B('الزبون','Customer'),n:r.customer||r.cn||r.person||'',p:r.customerPhone||r.phone||r.cp||''},lines:[{d:`${r.item||''}${r.fault?' — '+r.fault:''}`,q:1,u:c,t:c}],total:c,paid:num(r.received??r.recv),method:r.method,note:r.note||'',payments,vat:true,contract:true};
  }
  if(debt){const t=num(r.total);return{type:'debt',title:B('كشف دين','Debt statement'),r,party:{l:B('الطرف','Party'),n:r.person||r.party||'',p:r.phone||''},lines:[{d:r.reason||r.item||'',q:1,u:t,t}],total:t,paid:num(r.paid),method:r.method,note,payments}}
  if(vch){const a=num(r.amount??r.amt),inc=r.direction==='income'||r.vtype==='inc';return{type:'voucher',title:inc?B('سند قبض','Receipt voucher'):B('سند صرف','Payment voucher'),r,party:{l:B('الطرف','Party'),n:r.party||r.person||'',p:''},lines:[{d:r.title||r.reason||r.item||'',q:1,u:a,t:a}],total:a,paid:a,method:r.method,note,payments}}
  return{type:'other',title:B('مستند','Document'),r,party:{l:'',n:'',p:''},lines:[],total:0,paid:0,payments,note}
}

/* ---------------- sheet ---------------- */
const dt=(d,t)=>typeof dtext==='function'?dtext(d,t):`${d||''} ${t||''}`;
function header(title,noLabel,no,when){
  const lg=LG(),sh=SH(),co=lg.type==='company',name=(co&&lg.companyName)||sh.name||B('دفتر التاجر','Merchant Ledger');
  const ids=[];const add=(l,v)=>{if(v)ids.push(`<span><b>${l}</b> ${esc(v)}</span>`)};
  add(B('السجل التجاري (RC)','Trade register (RC)'),lg.rc);add(B('التعريف الضريبي (IF)','Tax ID (IF)'),lg.ifNo);add('ICE',lg.ice);add(B('الباتانتا','Patente'),lg.patente);add('CNSS',lg.cnss);
  const addr=lg.hq||sh.address||'',contact=[sh.phone,lg.email,lg.website].filter(Boolean).join(' · ');
  return `<header class="ps-head"><div class="ps-co"><h1>${esc(name)}${co&&lg.form?`<small>${esc(lg.form)}</small>`:''}</h1>${addr?`<p>${esc(addr)}</p>`:''}${contact?`<p>${esc(contact)}</p>`:''}${ids.length?`<div class="ps-ids">${ids.join('')}</div>`:''}</div><div class="ps-docno"><h2>${esc(title)}</h2><div class="ps-no"><small>${esc(noLabel)}</small><b>${esc(no)}</b></div><div class="ps-date">${esc(when)}</div></div></header>`;
}
function footer(d){
  const lg=LG();
  const t=(lg.footer||'').trim()||(d.contract?B('اتفق الطرفان على البيانات الواردة أعلاه، ويُعدّ هذا الوصل عقداً بين البائع والمشتري.','Both parties agree to the details above; this receipt serves as a contract between seller and buyer.'):'');
  return t?`<footer class="ps-foot">${esc(t)}</footer>`:'';
}
function sheet(d,no){
  const r=d.r,vr=d.vat?num(LG().vatRate):0,gross=d.total,ht=vr>0?gross/(1+vr/100):gross,vat=gross-ht,balance=Math.max(0,gross-d.paid);
  const rows=d.lines.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.d||'—')}</td><td class="n">${esc(r2(x.q))}</td><td class="n">${money(x.u)}</td><td class="n">${money(x.t)}</td></tr>`).join('');
  const pays=(d.payments||[]).map(p=>`<tr><td>${esc(dt(p.date,p.time))}</td><td>${esc(tr(p.method||''))}</td><td>${esc(p.note||'')}</td><td class="n">${money(p.amount??p.amt)}</td></tr>`).join('');
  return `<article class="ps" dir="${uiLang==='ar'?'rtl':'ltr'}">${header(d.title,d.numbered?B('رقم الفاتورة','Invoice no.'):B('المرجع','Reference'),no,dt(r.date,r.time))}
<section class="ps-party"><small>${esc(d.party.l)}</small><b>${esc(d.party.n||'—')}</b>${d.party.p?`<span dir="ltr">${esc(d.party.p)}</span>`:''}${d.extra?`<span><small>${esc(d.extra[0])}:</small> ${esc(d.extra[1])}</span>`:''}${d.numbered&&r.ref?`<span><small>${B('مرجع الصفقة','Deal ref')}:</small> ${esc(r.ref)}</span>`:''}</section>
<table class="ps-table"><thead><tr><th>#</th><th>${B('البيان','Description')}</th><th class="n">${B('الكمية','Qty')}</th><th class="n">${B('السعر','Price')}</th><th class="n">${B('المبلغ','Amount')}</th></tr></thead><tbody>${rows}</tbody></table>
<div class="ps-tot">${vr>0?`<div><span>${B('المجموع قبل الضريبة','Subtotal (excl. VAT)')}</span><b>${money(ht)}</b></div><div><span>${B('الضريبة على القيمة المضافة','VAT')} ${vr}٪</span><b>${money(vat)}</b></div>`:''}<div class="grand"><span>${B(vr>0?'الإجمالي مع الضريبة':'الإجمالي','Total')}</span><b>${money(gross)}</b></div><div><span>${B('المسدد','Paid')}</span><b>${money(d.paid)}</b></div><div class="due"><span>${B('المتبقي','Balance due')}</span><b>${money(balance)}</b></div></div>
${d.method?`<p style="margin:10px 0 0;font-size:13px;color:#5d6f67">${B('طريقة الدفع','Payment method')}: ${esc(tr(d.method))}</p>`:''}
${pays?`<div class="ps-sub">${B('الدفعات المسجلة','Recorded payments')}</div><table class="ps-table"><thead><tr><th>${B('التاريخ','Date')}</th><th>${B('الطريقة','Method')}</th><th>${B('ملاحظات','Notes')}</th><th class="n">${B('المبلغ','Amount')}</th></tr></thead><tbody>${pays}</tbody></table>`:''}
${d.note?`<div class="ps-note">${esc(d.note)}</div>`:''}
<div class="ps-sign"><div>${B(d.type==='purchase'?'توقيع المورّد':'توقيع البائع','Seller signature')}<i></i></div><div>${B(d.type==='purchase'?'توقيع المشتري':'توقيع المشتري','Buyer signature')}<i></i></div></div>
${footer(d)}</article>`;
}
function statementSheet(person){
  const rows=personStatementRows(person),rec=rows.filter(x=>x.type==='receivable').reduce((s,x)=>s+x.remaining,0),pay=rows.filter(x=>x.type==='payable').reduce((s,x)=>s+x.remaining,0);
  const label=t=>tr(t==='receivable'?'دين لي':t==='payable'?'دين عليّ':t==='income'?'سند قبض':'سند صرف');
  const body=rows.map(x=>`<tr><td>${esc(x.record.date||'')}</td><td>${esc(x.title)} · ${esc(x.record.ref||'')}</td><td>${esc(label(x.type))}</td><td class="n">${money(x.total)}</td><td class="n">${money(x.paid)}</td><td class="n">${money(x.remaining)}</td></tr>`).join('');
  const html=`<article class="ps" dir="${uiLang==='ar'?'rtl':'ltr'}">${header(B('كشف حساب','Account statement'),B('التاريخ','Date'),new Date().toLocaleDateString(uiLang==='ar'?'ar-MA':'en-GB'),'')}
<section class="ps-party"><small>${B('الطرف','Party')}</small><b>${esc(person)}</b></section>
<table class="ps-table"><thead><tr><th>${B('التاريخ','Date')}</th><th>${B('البيان','Description')}</th><th>${B('النوع','Type')}</th><th class="n">${B('الإجمالي','Total')}</th><th class="n">${B('المسدد','Paid')}</th><th class="n">${B('المتبقي','Balance')}</th></tr></thead><tbody>${body}</tbody></table>
<div class="ps-tot"><div><span>${B('المطلوب تحصيله','To collect')}</span><b>${money(rec)}</b></div><div class="due"><span>${B('المطلوب سداده','To pay')}</span><b>${money(pay)}</b></div></div>
<div class="ps-sign"><div>${B('توقيع الطرف الأول','First party')}<i></i></div><div>${B('توقيع الطرف الثاني','Second party')}<i></i></div></div>${footer({})}</article>`;
  const text=[(LG().companyName||SH().name||''),B('كشف حساب','Account statement')+' — '+person,B('المطلوب تحصيله','To collect')+': '+money(rec),B('المطلوب سداده','To pay')+': '+money(pay),'',...rows.map(x=>`${x.record.date||''} · ${x.title}: ${money(x.remaining)}`)].join('\n');
  return{html,text,title:B('كشف حساب','Statement')+' · '+person,file:'statement-'+person};
}
function docText(d,no){
  const lg=LG(),sh=SH(),name=(lg.type==='company'&&lg.companyName)||sh.name||'',r=d.r,L=[];
  L.push(name);const ids=[lg.rc&&'RC '+lg.rc,lg.ifNo&&'IF '+lg.ifNo,lg.ice&&'ICE '+lg.ice].filter(Boolean).join(' · ');if(ids)L.push(ids);
  L.push(`${d.title} ${no}`,dt(r.date,r.time),'');
  if(d.party.n)L.push(`${d.party.l}: ${d.party.n}`);
  d.lines.forEach(x=>L.push(`• ${x.d} × ${r2(x.q)} = ${money(x.t)}`));
  L.push('',`${B('الإجمالي','Total')}: ${money(d.total)}`,`${B('المسدد','Paid')}: ${money(d.paid)}`,`${B('المتبقي','Balance due')}: ${money(Math.max(0,d.total-d.paid))}`);
  return L.join('\n');
}

/* ---------------- viewer ---------------- */
let cur=null,pushed=false;
const native=()=>!!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform());
function openViewer(o){
  cur=o;let el=document.getElementById('px-doc');if(el)el.remove();
  el=document.createElement('div');el.id='px-doc';
  el.innerHTML=`<div class="px-doc-back" data-doc="close"></div><div class="px-doc-wrap" role="dialog" aria-modal="true" aria-label="${esc(o.title)}"><div class="px-doc-bar"><button type="button" class="px-doc-x" data-doc="close" aria-label="${B('إغلاق والرجوع','Close and go back')}">✕</button><strong>${esc(o.title)}</strong>${native()?'':`<button type="button" class="px-doc-btn" data-doc="print">🖨️ <span>${B('طباعة','Print')}</span></button>`}<button type="button" class="px-doc-btn pri" data-doc="share">📤 <span>${B('مشاركة','Share')}</span></button><button type="button" class="px-doc-btn" data-doc="save">💾 <span>${B('حفظ','Save')}</span></button></div><div class="px-doc-scroll">${o.html}</div></div>`;
  document.body.append(el);
  const a=document.getElementById('app-screen');if(a)a.inert=true;
  try{history.pushState({pxdoc:1},'');pushed=true}catch(e){pushed=false}
  const x=el.querySelector('.px-doc-x');if(x)x.focus();
}
function closeViewer(fromPop){
  const el=document.getElementById('px-doc');if(!el)return;
  el.remove();cur=null;
  const L=document.getElementById('lock-screen'),a=document.getElementById('app-screen');if(a&&(!L||L.hidden))a.inert=false;
  if(pushed&&!fromPop){pushed=false;try{history.back()}catch(e){}}else pushed=false;
}
window.addEventListener('popstate',()=>{if(document.getElementById('px-doc'))closeViewer(true)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.getElementById('px-doc')&&!document.getElementById('px-confirm')){e.stopPropagation();closeViewer()}},true);
document.addEventListener('click',async e=>{
  const b=e.target.closest&&e.target.closest('#px-doc [data-doc]');if(!b||!cur)return;
  const k=b.dataset.doc;
  if(k==='close'){closeViewer();return}
  if(k==='print'){try{window.print()}catch(er){toast(B('الطباعة غير متاحة هنا؛ استعمل حفظ أو مشاركة','Printing unavailable here; use Save or Share'),'error')}return}
  if(k==='share'){
    try{if(navigator.share){await navigator.share({title:cur.title,text:cur.text});return}}catch(er){if(er&&er.name==='AbortError')return}
    try{await navigator.clipboard.writeText(cur.text);toast(B('نُسخ نص المستند (المشاركة غير متاحة هنا)','Document text copied (sharing unavailable here)'),'success')}catch(er){toast(B('تعذرت المشاركة','Could not share'),'error')}
    return;
  }
  if(k==='save'){
    const doc=`<!doctype html><html lang="${uiLang}" dir="${uiLang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(cur.title)}</title><style>body{margin:0;padding:16px;background:#eef2ef}${PS_CSS.split('#px-doc')[0]}@media print{body{background:#fff;padding:0}.ps{border:0;max-width:none}}</style></head><body>${cur.html}</body></html>`;
    downloadBlob(`${(cur.file||'document').replace(/[\\/:*?"<>|\s]+/g,'_')}.html`,new Blob([doc],{type:'text/html;charset=utf-8'}));
  }
});

/* ---------------- overrides of the old window-based printing ---------------- */
printReceipt=async function(recordId){
  const r=docById('records',recordId);
  if(!r){toast(tr('لا يوجد سجل مطابق'),'error');return}
  let d=build(r),no=r.ref||r.id;
  if(d.numbered){no=await ensureInvoiceNo(r);const fresh=docById('records',recordId);if(fresh)d=build(fresh)}
  openViewer({title:`${d.title} · ${no}`,html:sheet(d,no),text:docText(d,no),file:`${d.type}-${no}`});
};
printStatement=function(person){
  const s=statementSheet(person);
  openViewer({title:s.title,html:s.html,text:s.text,file:s.file});
};

/* ---------------- Settings: shop identity & invoices ---------------- */
function legalPanel(){
  const lg=LG(),co=lg.type==='company';
  const f=(n,l,v,ph,ty)=>`<label class="field"><span>${l}</span><input name="${n}" class="control" type="${ty||'text'}" value="${v?esc(v):''}" placeholder="${ph||''}" ${ty==='number'?'min="0" step="any" inputmode="decimal"':''}></label>`;
  const body=`<form data-pxform="legal"><label class="field"><span>${B('نوع المحل','Business type')}</span><select name="type" class="control" id="lg-type"><option value="individual" ${!co?'selected':''}>${B('محل فردي / تاجر','Individual / sole trader')}</option><option value="company" ${co?'selected':''}>${B('شركة','Company')}</option></select></label>
<div id="lg-co" class="form-grid" style="margin-top:10px" ${co?'':'hidden'}>${f('companyName',B('الاسم القانوني للشركة','Legal company name'),lg.companyName)}<label class="field"><span>${B('الشكل القانوني','Legal form')}</span><select name="form" class="control"><option value=""></option>${FORMS.map(x=>`<option ${lg.form===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>${f('hq',B('المقر الاجتماعي','Registered address'),lg.hq)}</div>
<div class="form-grid" style="margin-top:10px">${f('rc',B('السجل التجاري (RC)','Trade register (RC)'),lg.rc)}${f('ifNo',B('التعريف الضريبي (IF)','Tax ID (IF)'),lg.ifNo)}${f('ice','ICE',lg.ice)}${f('patente',B('الباتانتا','Patente'),lg.patente)}${f('cnss','CNSS',lg.cnss)}${f('email',B('البريد الإلكتروني','Email'),lg.email,'','email')}${f('website',B('الموقع','Website'),lg.website)}</div>
<div class="nx-label" style="margin-top:14px">${B('ترقيم الفواتير والضريبة','Invoice numbering & VAT')}</div>
<div class="form-grid">${f('invoicePrefix',B('بادئة رقم الفاتورة','Invoice prefix'),lg.invoicePrefix,'F')}${f('invoiceStart',B('البدء من الرقم','Start from number'),lg.invoiceStart,'1','number')}${f('vatRate',B('نسبة الضريبة على القيمة المضافة ٪ (0 = بدون)','VAT rate % (0 = none)'),lg.vatRate,'0','number')}</div>
<label class="field" style="margin-top:10px"><span>${B('نص أسفل الفاتورة (اتركه فارغاً للنص الافتراضي: الوصل عقد بين البائع والمشتري)','Invoice footer (leave empty for default: receipt serves as a contract)')}</span><input name="footer" class="control" value="${lg.footer?esc(lg.footer):''}"></label>
<p class="form-note" style="margin:10px 0 0">${B('رقم الفاتورة يُولَّد تلقائياً مرة واحدة عند أول إصدار (مثال: F-2026-0001) ويبقى ثابتاً عند إعادة الطباعة. الأسعار المُدخلة تُعدّ شاملة للضريبة.','The invoice number is generated once at first issue (e.g. F-2026-0001) and stays fixed on reprint. Entered prices are treated as VAT-inclusive.')}</p>
<div class="form-footer"><span></span><button class="btn btn-primary" type="submit">${B('حفظ','Save')}</button></div></form>`;
  return `<div class="stack" style="margin-bottom:14px">${panel(B('هوية المحل والفواتير','Shop identity & invoices'),body)}</div>`;
}
const _rs=renderSettings;
renderSettings=function(){
  const h=_rs(),i=h.indexOf('<div class="content-grid">'),p=legalPanel();
  return i>0?h.slice(0,i)+p+h.slice(i):h+p;
};
document.addEventListener('change',e=>{
  if(e.target.id==='lg-type'){const c=document.getElementById('lg-co');if(c)c.hidden=e.target.value!=='company'}
});
document.addEventListener('submit',e=>{
  const f=e.target.closest&&e.target.closest('form[data-pxform="legal"]');if(!f)return;
  e.preventDefault();e.stopImmediatePropagation();
  const g=n=>(f.elements[n]?f.elements[n].value:'').trim();
  const legal={type:g('type')||'individual',companyName:g('companyName'),form:g('form'),hq:g('hq'),rc:g('rc'),ifNo:g('ifNo'),ice:g('ice'),patente:g('patente'),cnss:g('cnss'),email:g('email'),website:g('website'),invoicePrefix:g('invoicePrefix'),invoiceStart:Math.max(0,num(g('invoiceStart'))),vatRate:Math.max(0,Math.min(100,num(g('vatRate')))),footer:g('footer')};
  state.prefs={...state.prefs,legal,_updatedAt:Date.now()};
  commit({message:'تم حفظ هوية المحل والفواتير'});
},true);
})();
