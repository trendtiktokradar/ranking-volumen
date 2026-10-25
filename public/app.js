const DEF={h3:50000,h6:100000,h8:100000,h24:250000,unmigFactor:0.3,mcapUnmig:10000,mcapMig:100000,liqMig:10000,avgTrade:50,avgTradeUnmig:35,balance:0.4,minTx:100,ageOn:true,ageDays:7,feesRatio:0};
let F={...DEF,...JSON.parse(localStorage.rvFilters2||'{}')},hidden=JSON.parse(localStorage.rvHidden||'{}');
let W='h3',Q='',showHidden=false,data={coins:[]},view=[];
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const money=n=>n==null?'–':'$'+(n>=1e9?(n/1e9).toFixed(2)+'B':n>=1e6?(n/1e6).toFixed(2)+'M':n>=1e3?(n/1e3).toFixed(n>=1e5?0:1)+'K':Math.round(n));
const k=n=>n>=1e3?(n/1e3).toFixed(1)+'K':n;
const age=t=>{if(!isFinite(t))return'–';const s=(Date.now()-t)/1e3;return s<60?Math.round(s)+'s':s<3600?Math.round(s/60)+'m':s<172800?Math.round(s/3600)+'h':Math.round(s/86400)+'d'};
const txw=w=>(w==='h3'||w==='h6')?'h6':'h24';
function stats(c,w){const x=c.txw&&c.txw[w];if(x){const n=x.buys+x.sells;return{buys:x.buys,sells:x.sells,tx:n,n,avg:n?c.vol[w]/n:0,ratio:n?x.buys/n:0,bal:Math.max(x.buys,x.sells)?Math.min(x.buys,x.sells)/Math.max(x.buys,x.sells):0}}
 const tw=txw(w),t=c.tx[tw],n=t.buys+t.sells,f=w==='h3'?.5:w==='h8'?8/24:1;
 return{buys:Math.round(t.buys*f),sells:Math.round(t.sells*f),tx:Math.round(n*f),n,avg:n?c.vol[tw]/n:0,ratio:n?t.buys/n:0,bal:Math.max(t.buys,t.sells)?Math.min(t.buys,t.sells)/Math.max(t.buys,t.sells):0}}
const inSection=(c,s)=>s==='bonding'?!c.migrated&&!c.paidDex:s==='paid'?c.paidDex:c.migrated;
function passes(c){const u=!c.migrated,st=stats(c,W);
 if((c.vol[W]||0)<F[W]*(u?F.unmigFactor:1)||c.mcap<(u?F.mcapUnmig:F.mcapMig))return false;
 if(!u&&c.liquidity<F.liqMig)return false;
 if(st.avg<(u?F.avgTradeUnmig:F.avgTrade)||st.bal<F.balance||st.n<F.minTx)return false;
 if(F.ageOn&&Date.now()-c.createdAt>F.ageDays*864e5)return false;
 if(F.feesRatio>0&&c.fees?.feesRatio!=null&&c.fees.feesRatio<F.feesRatio)return false;
 return true}
const ICON={web:'🌐',twitter:'𝕏',telegram:'✈',discord:'◎'};
function row(c,isH){const st=stats(c,W),L=c.links||{},sh=c.ca.slice(0,4)+'…'+c.ca.slice(-4);
 return`<div class="r" data-ax="${c.axiom}">
 <div class="im">${c.image?`<img src="${esc(c.image)}" loading="lazy">`:'<div class="ph"></div>'}<span class="short" data-ca="${c.ca}" title="Copiar CA">${sh}</span></div>
 <div class="mid"><div class="t1"><span class="tk">${esc(c.symbol)}</span><span class="nm">${esc(c.name)}</span><span class="cp" data-ca="${c.ca}" title="Copiar CA">⧉</span></div>
 <div class="t2"><span class="age">${age(c.createdAt)}</span>${Object.entries(L).filter(([t])=>ICON[t]).map(([t,u])=>`<a href="${esc(u)}" target="_blank" rel="noopener" title="${t}">${ICON[t]}</a>`).join('')}
 <span class="b">▲ ${k(st.buys)}</span><span class="s">▼ ${k(st.sells)}</span>${c.paidDex?'<span class="pill">DEX PAID</span>':''}<span class="tag">${esc(c.dex)}</span></div>
 <div class="t2"><span class="sm">Liq ${money(c.liquidity)}</span><button class="eye" data-h="${c.ca}" title="${isH?'Restaurar':'Ocultar'}">${isH?'↺ restaurar':'⊘ ocultar'}</button></div></div>
 <div class="box"><div class="vm">V <b class="v">${money(c.vol[W])}</b>${(W==='h3'||W==='h8')&&!(c.txw&&c.txw[W])?' est.':''}&nbsp; MC <b class="mc">${money(c.mcap)}</b></div>
 ${c.ath?`<div class="sm">ATH <b class="ath">${money(c.ath.ath)}</b>${c.ath.estimated?' est.':''} <span class="s">${c.ath.ath>0?Math.round((c.mcap/c.ath.ath-1)*100)+'%':''}</span></div>`:''}<div class="sm">TX ${k(st.tx)} <span class="bar"><i style="width:${Math.round(st.ratio*100)}%"></i></span></div><div class="sm">Media ${money(st.avg)}/op</div></div></div>`}
function render(){$('nh').textContent=Object.keys(hidden).length;view=[];const q=Q.toLowerCase();
 const m=c=>!q||c.symbol.toLowerCase().includes(q)||c.name.toLowerCase().includes(q)||c.ca.toLowerCase()===q;
 $('cols').classList.toggle('h',showHidden);for(const id of['bonding','paid','migrated'])$('l_'+id).parentElement.hidden=showHidden;$('hcol').hidden=!showHidden;
 if(showHidden){const l=data.coins.filter(c=>hidden[c.ca]&&m(c));view=l;$('l_hidden').innerHTML=l.map(c=>row(c,true)).join('')||'<div class="empty">No hay coins ocultas.</div>';return}
 for(const s of['bonding','paid','migrated']){const l=data.coins.filter(c=>!hidden[c.ca]&&inSection(c,s)&&m(c)&&passes(c)).sort((a,b)=>b.vol[W]-a.vol[W]).slice(0,data.topN||50);
  l.forEach(c=>view.push({...c,_sec:s}));$('c_'+s).textContent=l.length;$('l_'+s).innerHTML=l.map(c=>row(c)).join('')||'<div class="empty">Ninguna pasa los filtros.</div>'}}
document.addEventListener('click',e=>{const t=e.target;
 if(t.dataset.w){W=t.dataset.w;document.querySelectorAll('#wins button').forEach(b=>b.classList.toggle('on',b===t));return render()}
 if(t.dataset.ca){navigator.clipboard?.writeText(t.dataset.ca);const o=t.textContent;t.textContent='Copiado';setTimeout(()=>t.textContent=o,900);return}
 if(t.dataset.h){const ca=t.dataset.h;hidden[ca]?delete hidden[ca]:hidden[ca]=Date.now();localStorage.rvHidden=JSON.stringify(hidden);return render()}
 if(t.closest('#hid')){showHidden=!showHidden;$('hid').classList.toggle('on',showHidden);return render()}
 if(t.closest('a,button,input'))return;const r=t.closest('.r');if(r)window.open(r.dataset.ax,'_blank','noopener')});
$('q').oninput=e=>{Q=e.target.value.trim();render()};
$('tf').onclick=()=>$('filters').hidden=!$('filters').hidden;
for(const key in DEF){const el=$('f_'+key);if(!el)continue;el.type==='checkbox'?el.checked=F[key]:el.value=F[key];
 el.oninput=()=>{F[key]=el.type==='checkbox'?el.checked:+el.value;localStorage.rvFilters2=JSON.stringify(F);render()}}
$('reset').onclick=()=>{localStorage.removeItem('rvFilters2');location.reload()};
$('csv').onclick=()=>{const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
 const rows=[['seccion','nombre','ticker','CA','volumen_'+W,'market_cap','liquidez','compras','ventas','media_op','ath','ath_estimado','creada','axiom']].concat(view.map(c=>{const st=stats(c,W);return[c._sec||'oculta',c.name,c.symbol,c.ca,Math.round(c.vol[W]),Math.round(c.mcap),Math.round(c.liquidity),st.buys,st.sells,Math.round(st.avg),Math.round(c.ath?.ath||0),c.ath?.estimated?'si':'no',new Date(c.createdAt).toISOString(),c.axiom]}));
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv'}));a.download=`ranking_${W}_${new Date().toISOString().slice(0,16)}.csv`;a.click()};
async function load(){try{const r=await fetch((window.DATA_URL||'data/coins.json')+'?t='+Date.now(),{cache:'no-store'});data=await r.json();
 $('upd').textContent='Actualizado '+new Date(data.updatedAt).toLocaleTimeString('es-ES')+' · '+data.coins.length+' analizadas';render()}catch(e){$('upd').textContent='Sin datos aún'}}
load();setInterval(load,60000);
