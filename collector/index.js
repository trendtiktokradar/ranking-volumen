import fs from 'node:fs';
import cfg from './config.js';
import { getFees } from './fees.js';
import * as H from './history.js';
const OUT = new URL('../public/data/', import.meta.url);
const t0 = Date.now();
const all = [];
const histFile = new URL('history.json', OUT);
const hist = H.load(histFile);
const athFile = new URL('ath.json', OUT);
const evFile = new URL('events.json', OUT);
let ev = {}; try { ev = JSON.parse(fs.readFileSync(evFile)); } catch {}
let athDb = {}; try { athDb = JSON.parse(fs.readFileSync(athFile)); } catch {}
const chartsFile = new URL('charts.json', OUT);
let prevCharts = {}; try { prevCharts = JSON.parse(fs.readFileSync(chartsFile)).charts || {}; } catch {}
const charts = {};
for (const name of cfg.chains) {
  const c = await import(`./chains/${name}.js`);
  const addrs = await c.discover(cfg);
  for (const [ca, t] of c.profileSeen || []) { const e = ev[ca] || (ev[ca] = { chain: name }); e.firstSeen ??= t; e.seen = t; }
  for (const ca in ev) if (ev[ca].chain === name && Date.now() - (ev[ca].seen || 0) < 26 * 36e5 && !addrs.includes(ca)) addrs.push(ca); // perfiles pagados vistos en las últimas 26 h
  console.log(`[${name}] candidatos: ${addrs.length}`);
  let coins = (await c.enrich(addrs)).filter((x) => x.vol.h24 >= cfg.minVolume24hCandidate || x.paidDex); // las de DEX pagado se guardan siempre (pestaña DEX Paid)
  coins.sort((a, b) => b.vol.h24 - a.vol.h24);
  console.log(`[${name}] con volumen 24h >= ${cfg.minVolume24hCandidate}: ${coins.length}`);
  if (c.pumpAth) await c.pumpAth(coins);
  // Eventos: cuándo se pagó el DEX y cuándo migró (persistido en events.json)
  let nOrders = 0;
  const needPaid = coins.filter((x) => x.paidDex && !(ev[x.ca] && "paidAt" in ev[x.ca])).sort((a, b) => b.createdAt - a.createdAt); // más nuevas primero (backlog se vacía en pocas ejecuciones)
  const ordersJob = (async () => {
    for (const x of needPaid) {
      if (nOrders >= cfg.maxOrdersRequests || Date.now() - t0 > cfg.timeBudgetMs) break;
      const t = await c.paidAt(x.ca); nOrders++;
      if (t !== undefined) { const e = ev[x.ca] || (ev[x.ca] = { chain: name }); e.firstSeen ??= Date.now(); e.paidAt = t ?? e.firstSeen; e.paidEst = t == null; x.paidAt = e.paidAt; x.paidEst = e.paidEst; }
      await new Promise((r) => setTimeout(r, 1050));
    }
  })();
  for (const x of coins) {
    const e = ev[x.ca] || (ev[x.ca] = { chain: name });
    if (x.paidDex) { e.seen = Date.now(); e.firstSeen ??= Date.now(); }
    if (x.migratedAt && !e.migratedAt) e.migratedAt = x.migratedAt;
    x.paidAt = x.paidDex ? e.paidAt ?? null : null; x.paidEst = !!e.paidEst; x.migratedAt = e.migratedAt || x.migratedAt || null;
  }
  for (const ca in ev) if (!ev[ca].paidAt && !ev[ca].migratedAt && Date.now() - (ev[ca].seen || 0) > 26 * 36e5) delete ev[ca];

  for (const x of coins) { // ATH: max(pump.fun, guardado, MC actual); nunca baja
    const prev = athDb[x.ca] || { ath: 0 };
    let cur = { ath: prev.ath, t: prev.t, src: prev.src };
    if (x.pumpAth && x.pumpAth.ath >= cur.ath) cur = { ath: x.pumpAth.ath, t: x.pumpAth.t, src: 'pump' };
    if (x.mcap > cur.ath) cur = { ath: x.mcap, t: Date.now(), src: cur.src === 'pump' ? 'pump+live' : 'live' };
    athDb[x.ca] = cur; x.ath = { ...cur, estimated: !String(cur.src).startsWith('pump') };
    delete x.pumpAth;
  }
  H.push(hist, coins, cfg.historyHours);
  let n = 0;
  for (const coin of coins) {
    coin.txw = {};
    for (const [w, h] of [['h3', 3], ['h8', 8]]) {
      const r = H.windowFromHistory(hist, coin.ca, h);
      if (r) { coin.vol[w] = r.vol; coin.txw[w] = { buys: r.buys, sells: r.sells }; }
    }
    coin.volEstimated = !(coin.txw.h3 && coin.txw.h8);
    if (coin.volEstimated) {
      let hv = null;
      if (n < cfg.maxOhlcvRequests && Date.now() - t0 < cfg.timeBudgetMs) { hv = await c.hourlyVolumes(coin, cfg); n++; }
      if (!coin.txw.h3) coin.vol.h3 = hv ? hv.h3 : coin.vol.h6 / 2;
      if (!coin.txw.h8) coin.vol.h8 = hv ? hv.h8 : coin.vol.h6 + (coin.vol.h24 - coin.vol.h6) / 9;
    }
    coin.fees = await getFees(coin, cfg);
  }
  await ordersJob;
  for (const x of coins) { const e = ev[x.ca]; if (x.paidDex && e && 'paidAt' in e) { x.paidAt = e.paidAt; x.paidEst = !!e.paidEst; } }
  console.log(`[${name}] órdenes DEX consultadas: ${nOrders}, pendientes: ${Math.max(0, needPaid.length - nOrders)}`);
  console.log(`[${name}] 3h/8h desde historial: ${coins.filter((x) => !x.volEstimated).length}, velas GT: ${n}, instantáneas: ${hist.snaps.length}`);
  // Gráficas de la pestaña DEX Paid: pagadas en las últimas chartHours h, las más recientes primero
  if (c.chart) {
    const want = coins.filter((x) => x.paidDex && x.paidAt && Date.now() - x.paidAt <= cfg.chartHours * 36e5 && x.pair).sort((a, b) => b.paidAt - a.paidAt);
    let got = 0, reused = 0, fails = 0;
    for (const x of want) {
      const prev = prevCharts[x.ca];
      if (prev && prev.p === x.pair && Date.now() - prev.f < cfg.chartReuseMin * 60e3) { charts[x.ca] = prev; reused++; continue; }
      if (Date.now() - t0 > cfg.chartDeadlineMs) { if (prev && prev.p === x.pair) { charts[x.ca] = prev; reused++; } continue; }
      const ch = await c.chart(x.pair, cfg);
      if (ch) { charts[x.ca] = { ...ch, p: x.pair, f: Date.now() }; got++; }
      else { fails++; if (prev && prev.p === x.pair) { charts[x.ca] = prev; reused++; } }
    }
    console.log(`[${name}] gráficas DEX Paid: ${want.length} coins, descargadas ${got}, reutilizadas ${reused}, sin datos/error ${fails}, sin pedir ${want.length - got - reused - fails}`);
  }
  all.push(...coins);
}
console.log(`en curva sin DEX pagado: ${all.filter((x) => !x.migrated && !x.paidDex).length}`);
const data = { updatedAt: new Date().toISOString(), tookSec: Math.round((Date.now() - t0) / 1000), topN: cfg.topN, coins: all };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(new URL('coins.json', OUT), JSON.stringify(data));
fs.writeFileSync(histFile, JSON.stringify(hist));
fs.writeFileSync(athFile, JSON.stringify(athDb));
fs.writeFileSync(evFile, JSON.stringify(ev));
fs.writeFileSync(chartsFile, JSON.stringify({ updatedAt: data.updatedAt, charts }));
const cols = ['chain', 'ca', 'name', 'symbol', 'pair', 'dex', 'migrated', 'paidDex', 'mcap', 'liquidity', 'createdAt'];
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [[...cols, 'paidAt', 'migratedAt', 'ath', 'vol3h', 'vol6h', 'vol8h', 'vol24h', 'buys24h', 'sells24h', 'axiom'].join(',')]
  .concat(all.map((x) => [...cols.map((k) => esc(x[k])), x.paidAt ? new Date(x.paidAt).toISOString() : '', x.migratedAt ? new Date(x.migratedAt).toISOString() : '', Math.round(x.ath?.ath || 0), x.vol.h3, x.vol.h6, x.vol.h8, x.vol.h24, x.tx.h24.buys, x.tx.h24.sells, x.axiom].join(',')));
fs.writeFileSync(new URL('coins.csv', OUT), csv.join('\n'));
console.log(`OK ${all.length} coins en ${data.tookSec}s`);
