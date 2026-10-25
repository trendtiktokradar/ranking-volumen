import fs from 'node:fs';
import cfg from './config.js';
import { getFees } from './fees.js';
const OUT = new URL('../public/data/', import.meta.url);
const t0 = Date.now();
const all = [];
for (const name of cfg.chains) {
  const c = await import(`./chains/${name}.js`);
  const addrs = await c.discover(cfg); console.log(`[${name}] candidatos: ${addrs.length}`);
  let coins = (await c.enrich(addrs)).filter((x) => x.vol.h24 >= cfg.minVolume24hCandidate);
  coins.sort((a, b) => b.vol.h24 - a.vol.h24);
  console.log(`[${name}] con volumen 24h >= ${cfg.minVolume24hCandidate}: ${coins.length}`);
  let n = 0;
  for (const coin of coins) {
    const est = { h3: coin.vol.h6 / 2, h8: coin.vol.h6 + (coin.vol.h24 - coin.vol.h6) / 9 }; // estimación si no hay velas
    let hv = null; if (n < cfg.maxOhlcvRequests && Date.now() - t0 < cfg.timeBudgetMs) { hv = await c.hourlyVolumes(coin, cfg); n++; }
    coin.vol.h3 = hv ? hv.h3 : est.h3; coin.vol.h8 = hv ? hv.h8 : est.h8; coin.volEstimated = !hv;
    coin.fees = await getFees(coin, cfg);
  }
  all.push(...coins);
}
const data = { updatedAt: new Date().toISOString(), tookSec: Math.round((Date.now() - t0) / 1000), topN: cfg.topN, coins: all };
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(new URL('coins.json', OUT), JSON.stringify(data));
const cols = ['chain', 'ca', 'name', 'symbol', 'pair', 'dex', 'migrated', 'paidDex', 'mcap', 'liquidity', 'createdAt'];
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const csv = [[...cols, 'vol3h', 'vol6h', 'vol8h', 'vol24h', 'buys24h', 'sells24h', 'axiom'].join(',')]
  .concat(all.map((x) => [...cols.map((k) => esc(x[k])), x.vol.h3, x.vol.h6, x.vol.h8, x.vol.h24, x.tx.h24.buys, x.tx.h24.sells, x.axiom].join(',')));
fs.writeFileSync(new URL('coins.csv', OUT), csv.join('\n'));
console.log(`OK ${all.length} coins en ${data.tookSec}s`);
