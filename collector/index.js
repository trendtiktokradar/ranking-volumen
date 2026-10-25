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
let athDb = {}; try { athDb = JSON.parse(fs.readFileSync(athFile)); } catch {}
for (const name of cfg.chains) {
  const c = await import(`./chains/${name}.js`);
  const addrs = await c.discover(cfg); console.log(`[${name}] candidatos: ${addrs.length}`);
  let coins = (await c.enrich(addrs)).filter((x) => x.vol.h24 >= cfg.minVolume24hCandidate);
  coins.sort((a, b) => b.vol.h24 - a.vol.h24);
  console.log(`[${name}] con volumen 24h >= ${cfg.minVolume24hCandidate}: ${coins.length}`);
  if (c.pumpAth) await c.pumpAth(coins);
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
  console.log(`[${name}] 3h/8h desde historial: ${coins.filter((x) => !x.volEstimated).length}, velas GT: ${n}, instantáneas: ${hist.snaps.length}`);
  all.push(...coins);
}
const data = { updatedAt: new Date().toISOString(), tookSec: Math.round((Date.now() - t0) / 1000), topN: cfg.topN, coins: all };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(new URL('coins.json', OUT), JSON.stringify(data));
fs.writeFileSync(histFile, JSON.stringify(hist));
fs.writeFileSync(athFile, JSON.stringify(athDb));
const cols = ['chain', 'ca', 'name', 'symbol', 'pair', 'dex', 'migrated', 'paidDex', 'mcap', 'liquidity', 'createdAt'];
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [[...cols, 'ath', 'vol3h', 'vol6h', 'vol8h', 'vol24h', 'buys24h', 'sells24h', 'axiom'].join(',')]
  .concat(all.map((x) => [...cols.map((k) => esc(x[k])), Math.round(x.ath?.ath || 0), x.vol.h3, x.vol.h6, x.vol.h8, x.vol.h24, x.tx.h24.buys, x.tx.h24.sells, x.axiom].join(',')));
fs.writeFileSync(new URL('coins.csv', OUT), csv.join('\n'));
console.log(`OK ${all.length} coins en ${data.tookSec}s`);
