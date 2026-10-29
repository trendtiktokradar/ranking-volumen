const DEF={h1:2000,h3:5000,h6:8000,h8:10000,h24:15000,unmigFactor:0.5,mcapUnmig:0,mcapMig:0,liqMig:0,avgTrade:20,avgTradeUnmig:20,balance:0.25,minTx:30,ageOn:false,ageDays:7,feesRatio:0,athMin:20000};
let F={...DEF,...JSON.parse(localStorage.rvFilters7||'{}')},hidden=JSON.parse(localStorage.rvHidden||'{}');
let MODE='rank',W='h3',Q='',showHidden=false,data={coins:[]},view=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const money=n=>n==null?'–':'$'+(n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(n>=1e5?0:1)+'K':Math.round(n));
const k=n=>n>=1e3?(n/1e3).toFixed(1)+'K':n;
const age=t=>{if(!isFinite(t))return'–';const s=(Date.now()-t)/1e3;return s<60?Math.round(s)+'s':s<3600?Math.round(s/60)+'m':s<172800?Math.round(s/3600)+'h':Math.round(s/86400)+'d'};
const txw=w=>w==='h1'?'h1':(w==='h3'||w==='h6')?'h6':'h24';
function stats(c,w){const x=c.txw&&c.txw[w];if(x){const n=x.buys+x.sells;return{buys:x.buys,sells:x.sells,tx:n,n,avg:n?c.vol[w]/n:0,ratio:n?x.buys/n:0,bal:Math.max(x.buys,x.sells)?Math.min(x.buys,x.sells)/Math.max(x.buys,x.sells):0}}
 const tw=txw(w),t=c.tx[tw],n=t.buys+t.sells,f=w==='h3'?.5:w==='h8'?8/24:1;
 return{buys:Math.round(t.buys*f),sells:Math.round(t.sells*f),tx:Math.round(n*f),n,avg:n?c.vol[tw]/n:0,ratio:n?t.buys/n:0,bal:Math.max(t.buys,t.sells)?Math.min(t.buys,t.sells)/Math.max(t.buys,t.sells):0}}
const WH={h1:1,h3:3,h6:6,h8:8,h24:24};
const evTime=(c,s)=>s==='bonding'?c.createdAt:s==='paid'?c.paidAt:c.migratedAt;
const inWin=t=>t&&isFinite(t)&&Date.now()-t<=WH[W]*36e5;
const MAXAGE={h1:24,h3:24,h6:24,h8:24,h24:24}; // edad máx. de la coin (h) para DEX pagado según ventana
const inSection=(c,s)=>s==='bonding'?!c.migrated&&!c.paidDex&&inWin(c.createdAt):s==='paid'?c.paidDex&&!c.migrated&&inWin(c.paidAt)&&c.createdAt&&Date.now()-c.createdAt<=MAXAGE[W]*36e5:c.migrated&&inWin(c.migratedAt); // DEX pagado: pagado dentro de la ventana y con volumen en ella
function passes(c){const u=!c.migrated,st=stats(c,W);
 if((c.vol[W]||0)<F[W]*(u?F.unmigFactor:1)||c.mcap<(u?F.mcapUnmig:F.mcapMig))return false;
 if(!u&&c.liquidity<F.liqMig)return false;
 if(st.avg<(u?F.avgTradeUnmig:F.avgTrade)||st.bal<F.balance||st.n<F.minTx)return false;
 if(F.ageOn&&Date.now()-c.createdAt>F.ageDays*864e5)return false;
 if(F.feesRatio>0&&c.fees?.feesRatio!=null&&c.fees.feesRatio<F.feesRatio)return false;
 return true}
// Sin migrar: ATH mínimo y bloques por ATH (USD)
const ATHB=[[55e3,Infinity,'55k+'],[5e4,55e3,'50–55k'],[4e4,5e4,'40–50k'],[3e4,4e4,'30–40k'],[2e4,3e4,'20–30k'],[1e4,2e4,'10–20k'],[0,1e4,'<10k']];
const athV=c=>c.ath&&c.ath.ath>0?c.ath.ath:null;
const athOk=c=>!(F.athMin>0)||(athV(c)!=null&&athV(c)>=F.athMin);
function athBlocks(l){const out=ATHB.filter(([lo,hi])=>hi>(F.athMin||0)).map(([lo,hi,lb])=>[lb,l.filter(c=>{const a=athV(c);return a!=null&&a>=lo&&a<hi})]);
 if(!(F.athMin>0))out.push(['sin datos',l.filter(c=>athV(c)==null)]);return out.filter(([,g])=>g.length)}
const ICON={web:'🌐',twitter:'𝕏',telegram:'✈',discord:'◎'};
function row(c,isH,s,sp){const evl=s==='paid'?`<span class="evt">DEX pagado hace ${age(c.paidAt)}${c.paidEst?' (aprox.)':''}</span>`:s==='migrated'?`<span class="evt">migró hace ${age(c.migratedAt)}</span>`:'';const st=stats(c,W),L=c.links||{},sh=c.ca.slice(0,4)+'…'+c.ca.slice(-4);
 return`<div class="r" data-ax="${c.axiom}">
 <div class="im">${c.image?`<img src="${esc(c.image)}" loading="lazy">`:'<div class="ph"></div>'}<span class="short" data-ca="${c.ca}" title="Copiar CA">${sh}</span></div>
 <div class="mid"><div class="t1"><span class="tk">${esc(c.symbol)}</span><span class="nm">${esc(c.name)}</span><span class="cp" data-ca="${c.ca}" title="Copiar CA">⧉</span></div>
 <div class="t2"><span class="age" title="edad de la coin">${age(c.createdAt)}</span>${evl}${Object.entries(L).filter(([t])=>ICON[t]).map(([t,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener" title="${t}">${ICON[t]}</a>`).join('')}
 <span class="b">▲ ${k(st.buys)}</span><span class="s">▼ ${k(st.sells)}</span>${c.paidDex?'<span class="pill">DEX PAID</span>':''}<span class="tag">${c.migrated?'migrada · '+esc(c.dex):'curva'}</span></div>
 <div class="t2"><span class="sm">Liq ${money(c.liquidity)}</span><button class="eye" data-h="${c.ca}" title="${isH?'Restaurar':'Ocultar'}">${isH?'↺ restaurar':'⊘ ocultar'}</button></div></div>
 ${sp?spark(c):''}<div class="box"><div class="vm">V <b class="v">${money(c.vol[W])}</b>${(W==='h3'||W==='h8')&&!(c.txw&&c.txw[W])?' est.':''}&nbsp; MC <b class="mc">${money(c.mcap)}</b></div>
 ${c.ath?`<div class="sm">ATH <b class="ath">${money(c.ath.ath)}</b>${c.ath.estimated?' est.':''} <span class="s">${c.ath.ath>0?Math.round((c.mcap/c.ath.ath-1)*100)+'%':''}</span></div>`:''}<div class="sm">TX ${k(st.tx)} <span class="bar"><i style="width:${Math.round(st.ratio*100)}%"></i></span></div><div class="sm">Media ${money(st.avg)}/op</div></div></div>`}
// Gráficas (solo pestaña DEX Paid): charts.json se carga al abrir la pestaña
let CH=null,chLoading=false;
async function loadCharts(force){if(chLoading||(CH&&!force))return;chLoading=true;try{const u=(window.DATA_URL||'data/coins.json').replace(/coins\.json$/,'charts.json');const r=await fetch(u+'?t='+Date.now(),{cache:'no-store'});if(r.ok){CH=(await r.json()).charts||{};if(MODE==='paid')renderPaid()}}catch(e){}chLoading=false}
function spark(c){const g=CH&&CH[c.ca];if(!CH)return'<div class="spark ph2">cargando…</div>';if(!g||!g.c||g.c.length<2)return'<div class="spark ph2">sin gráfica</div>';
 const v=g.c,n=v.length,W2=200,H2=50,P=3;let mn=Infinity,mx=-Infinity,im=0;v.forEach((x,i)=>{if(x<mn)mn=x;if(x>mx){mx=x;im=i}});const rg=mx-mn||1;
 const X=i=>(P+i*(W2-2*P)/(n-1)).toFixed(1),Y=x=>(H2-P-(x-mn)*(H2-2*P)/rg).toFixed(1);
 const col=v[n-1]>v[0]?'#2ecc71':'#ff5c5c',pts=v.map((x,i)=>X(i)+','+Y(x)).join(' ');
 let pm='';const pt=c.paidAt/1e3;if(c.paidAt&&pt>=g.t0&&pt<=g.t0+(n-1)*g.s){const xp=X((pt-g.t0)/g.s);pm=`<line x1="${xp}" x2="${xp}" y1="2" y2="${H2-2}" stroke="#f5c542" stroke-width="1" stroke-dasharray="2 2" opacity=".7"><title>DEX pagado</title></line>`}
 return`<div class="spark" title="${n*5>=120?Math.round(n*5/60)+' h':n*5+' min'} · velas 5 min · ATH ${money(mx)}"><svg width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}">${pm}<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/><circle cx="${X(im)}" cy="${Y(mx)}" r="2.6" fill="#fff" stroke="${col}"><title>ATH ${money(mx)}</title></circle></svg></div>`}
function renderPaid(){const l=data.coins.filter(c=>c.paidDex&&c.paidAt&&inWin(c.paidAt)&&(showHidden?hidden[c.ca]:!hidden[c.ca])).filter(c=>{const q=Q.toLowerCase();return !q||c.symbol.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)||c.ca.toLowerCase()===q}).sort((a,b)=>b.paidAt-a.paidAt);
 view=l.map(c=>({...c,_sec:c.migrated?'dexpaid_migrada':'dexpaid_curva'}));$('c_dexpaid').textContent=l.length;
 loadCharts();$('l_dexpaid').innerHTML=l.map((c,i)=>row(c,showHidden,'paid',true)).join('')||'<div class="empty">Ninguna coin pagó DEX en esta ventana.</div>'}
function render(){$('cols').hidden=MODE!=='rank';$('pcol').hidden=MODE!=='paid';document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.m===MODE));
 if(MODE==='paid'){$('nh').textContent=Object.keys(hidden).length;return renderPaid()}$('nh').textContent=Object.keys(hidden).length;view=[];const q=Q.toLowerCase();
 const m=c=>!q||c.symbol.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)||c.ca.toLowerCase()===q;
 $('cols').classList.toggle('h',showHidden);for(const id of['bonding','paid','migrated'])$('l_'+id).parentElement.hidden=showHidden;$('hcol').hidden=!showHidden;
 if(showHidden){const l=data.coins.filter(c=>hidden[c.ca]&&m(c));view=l;$('l_hidden').innerHTML=l.map(c=>row(c,true)).join('')||'<div class="empty">No hay coins ocultas.</div>';return}
 document.querySelectorAll('#athb button').forEach(b=>b.classList.toggle('on',+b.dataset.ath===(F.athMin||0)));
 for(const s of['bonding','paid','migrated']){const l=data.coins.filter(c=>!hidden[c.ca]&&inSection(c,s)&&m(c)&&passes(c)&&(s!=='bonding'||athOk(c))).sort((a,b)=>b.vol[W]-a.vol[W]).slice(0,data.topN||50);
  l.forEach(c=>view.push({...c,_sec:s}));$('c_'+s).textContent=l.length;$('l_'+s).innerHTML=(s==='bonding'?athBlocks(l).map(([lb,g])=>`<div class="bh">ATH ${lb} <span>${g.length}</span></div>`+g.map(c=>row(c,false,s)).join('')).join(''):l.map(c=>row(c,false,s)).join(''))||'<div class="empty">Ninguna pasa los filtros.</div>'}}
document.addEventListener('click',e=>{const t=e.target;
 if(t.dataset.m){MODE=t.dataset.m;history.replaceState(null,'',MODE==='paid'?'#dexpaid':'#');return render()}
 if(t.dataset.ath!=null){F.athMin=+t.dataset.ath;localStorage.rvFilters7=JSON.stringify(F);return render()}
 if(t.dataset.w){W=t.dataset.w;document.querySelectorAll('#wins button').forEach(b=>b.classList.toggle('on',b===t));return render()}
 if(t.dataset.ca){navigator.clipboard?.writeText(t.dataset.ca);const o=t.textContent;t.textContent='Copiado';setTimeout(()=>t.textContent=o,900);return}
 if(t.dataset.h){const ca=t.dataset.h;hidden[ca]?delete hidden[ca]:hidden[ca]=Date.now();localStorage.rvHidden=JSON.stringify(hidden);return render()}
 if(t.closest('#hid')){showHidden=!showHidden;$('hid').classList.toggle('on',showHidden);return render()}
 if(t.closest('a,button,input'))return;const r=t.closest('.r');if(r)window.open(r.dataset.ax,'_blank','noopener')});
$('q').oninput=e=>{Q=e.target.value.trim();render()};
$('tf').onclick=()=>$('filters').hidden=!$('filters').hidden;
for(const key in DEF){const el=$('f_'+key);if(!el)continue;el.type==='checkbox'?el.checked=F[key]:el.value=F[key];
 el.oninput=()=>{F[key]=el.type==='checkbox'?el.checked:+el.value;localStorage.rvFilters7=JSON.stringify(F);render()}}
$('reset').onclick=()=>{localStorage.removeItem('rvFilters7');location.reload()};
$('csv').onclick=()=>{const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const rows=[['seccion','nombre','ticker','CA','volumen_'+W,'market_cap','liquidez','compras','ventas','media_op','dex_pagado','migrada','ath','ath_estimado','creada','axiom']].concat(view.map(c=>{const st=stats(c,W);return[c._sec||'oculta',c.name,c.symbol,c.ca,Math.round(c.vol[W]),Math.round(c.mcap),Math.round(c.liquidity),st.buys,st.sells,Math.round(st.avg),c.paidAt?new Date(c.paidAt).toISOString():'',c.migratedAt?new Date(c.migratedAt).toISOString():'',Math.round(c.ath?.ath||0),c.ath?.estimated?'si':'no',new Date(c.createdAt).toISOString(),c.axiom]}));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'}));a.download=`ranking_${W}_${new Date().toISOString().slice(0,16)}.csv`;a.click()};
async function load(){try{const r=await fetch((window.DATA_URL||'data/coins.json')+'?t='+Date.now(),{cache:'no-store'});data=await r.json();
 if(CH)loadCharts(true);$('upd').textContent='Actualizado '+new Date(data.updatedAt).toLocaleTimeString('es-ES')+' · '+data.coins.length+' analizadas';render()}catch(e){$('upd').textContent='Sin datos aún'}}
// Botón Actualizar: lanza el workflow vía /api/refresh y espera a que termine
let rfTimer=null;
const rfMsg=(t,err)=>{const m=$('rfmsg');m.textContent=t||'';m.classList.toggle('err',!!err)};
async function rfApi(method){let r,j={};try{r=await fetch('/api/refresh',{method,cache:'no-store'});j=await r.json()}catch(e){throw new Error(r?`Error ${r.status} en /api/refresh`:'No se pudo contactar con /api/refresh')}
 if(!r.ok||j.ok===false)throw new Error(j.error||`Error ${r.status}`);return j}
function rfDone(t,err){clearInterval(rfTimer);rfTimer=null;$('rf').disabled=false;rfMsg(t,err)}
function rfPoll(match){const t0=Date.now();rfTimer=setInterval(async()=>{try{
 const {run}=await rfApi('GET');
 if(!run||!match(run)){if(Date.now()-t0>3*60e3)rfDone('No aparece la ejecución en GitHub',true);return}
 if(run.status!=='completed')return rfMsg('Actualizando… (~9 min)');
 if(run.conclusion==='success'){await new Promise(r=>setTimeout(r,5000));await load();rfDone('✓ Datos actualizados')}
 else rfDone('La actualización falló ('+(run.conclusion||'error')+')',true)
 }catch(e){rfDone(e.message,true)}},20000)}
$('rf').onclick=async()=>{if(rfTimer)return;$('rf').disabled=true;rfMsg('Lanzando…');try{
 const j=await rfApi('POST');
 if(j.dispatched){const since=new Date(j.since).getTime()-60e3;rfMsg('Actualizando… (~9 min)');rfPoll(run=>new Date(run.createdAt).getTime()>=since)}
 else if(j.run&&j.run.status!=='completed'){rfMsg(j.message+'… (~9 min)');rfPoll(run=>run.id===j.run.id)}
 else rfDone(j.message||'No se lanzó')
 }catch(e){rfDone(e.message,true)}};
if(location.hash==='#dexpaid')MODE='paid';
load();setInterval(load,60000);
