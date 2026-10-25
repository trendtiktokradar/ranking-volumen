import { getJson } from '../http.js';
const DS = 'https://api.dexscreener.com';
const GT = 'https://api.geckoterminal.com/api/v2/networks/solana';
// DEX de bonding curve (no migradas)
export const BONDING_DEXES = new Set(['pumpfun', 'launchlab', 'raydium-launchlab', 'meteora-dbc', 'moonshot', 'boop', 'believe', 'bonk', 'letsbonk']);
export const chain = 'solana';
// Tokens que no son memecoins (wrapped, stables, LST): fuera del ranking
export const NOT_MEME = new Set(['SOL','WSOL','USDC','USDT','USD1','PYUSD','USDS','WETH','ETH','CBBTC','WBTC','BTC','JITOSOL','MSOL','BSOL','JUPSOL','INF','JLP','EURC','USDG','FDUSD','USDE','XAUT','PAXG']);
export const axiomUrl = (pair) => `https://axiom.trade/meme/${pair}`;

const PF = 'https://frontend-api-v3.pump.fun';
export const pumpMints = new Set();
const pumpInfo = new Map();
export const isPump = (ca, pairs = []) => ca.endsWith('pump') || pumpMints.has(ca) || pairs.some((p) => p.dexId === 'pumpfun');

export async function discover(cfg) {
  const addrs = new Set();
  // pump.fun (API pública del frontend, sin auth)
  const pfUrls = [`${PF}/coins/currently-live?limit=50&offset=0&includeNsfw=true`];
  for (const complete of [false, true]) for (let off = 0; off < cfg.pumpPages * 50; off += 50)
    pfUrls.push(`${PF}/coins?offset=${off}&limit=50&sort=market_cap&order=DESC&includeNsfw=true&complete=${complete}`);
  for (let off = 0; off < cfg.pumpPages * 50; off += 50) pfUrls.push(`${PF}/coins?offset=${off}&limit=50&sort=last_trade_timestamp&order=DESC&includeNsfw=true`);
  const pfs = await Promise.all(pfUrls.map((u) => getJson(u)));
  for (const l of pfs) for (const c of Array.isArray(l) ? l : []) if (c.mint && (c.usd_market_cap || 0) >= cfg.pumpMinMcap) { pumpMints.add(c.mint); addrs.add(c.mint); pumpInfo.set(c.mint, c); }
  const add = (a) => a && !a.startsWith('So1111') && addrs.add(a);
  const ds = await Promise.all([
    getJson(`${DS}/token-profiles/latest/v1`), getJson(`${DS}/token-boosts/latest/v1`),
    getJson(`${DS}/token-boosts/top/v1`), getJson(`${DS}/community-takeovers/latest/v1`),
  ]);
  for (const list of ds) for (const t of list || []) if (t.chainId === chain) add(t.tokenAddress);
  for (const q of ['pump', 'pumpfun', 'pumpswap', 'pump.fun', 'solana pump']) {
    const s = await getJson(`${DS}/latest/dex/search?q=${encodeURIComponent(q)}`);
    for (const p of s?.pairs || []) if (p.chainId === chain) add(p.baseToken.address);
  }
  const gtUrls = [];
  for (let pg = 1; pg <= 2; pg++) gtUrls.push(`${GT}/trending_pools?page=${pg}`, `${GT}/pools?sort=h24_volume_usd_desc&page=${pg}`,
    `${GT}/dexes/pump-fun/pools?sort=h24_volume_usd_desc&page=${pg}`, `${GT}/dexes/pumpswap/pools?sort=h24_volume_usd_desc&page=${pg}`);
  gtUrls.push(`${GT}/new_pools?page=1`);
  for (const u of gtUrls) {
    const r = await getJson(u, { gecko: true, delay: cfg.geckoDelayMs });
    for (const p of r?.data || []) add(p.relationships?.base_token?.data?.id?.replace('solana_', ''));
  }
  return [...addrs];
}

export async function enrich(addrs) {
  const coins = [];
  for (let i = 0; i < addrs.length; i += 30) {
    const pairs = await getJson(`${DS}/tokens/v1/${chain}/${addrs.slice(i, i + 30).join(',')}`);
    const byToken = new Map();
    for (const p of pairs || []) {
      if (p.chainId !== chain) continue;
      const k = p.baseToken.address; if (!byToken.has(k)) byToken.set(k, []); byToken.get(k).push(p);
    }
    for (const [ca, ps] of byToken) {
      ps.sort((a, b) => (b.volume?.h24 || 0) - (a.volume?.h24 || 0));
      const main = ps[0];
      if (NOT_MEME.has(String(main.baseToken.symbol).toUpperCase())) continue;
      if (!isPump(ca, ps)) continue; // solo coins lanzadas en pump.fun
      const sum = (f) => ps.reduce((s, p) => s + (f(p) || 0), 0);
      const migPairs = ps.filter((p) => !BONDING_DEXES.has(p.dexId) && (p.liquidity?.usd || 0) > 0);
      const migrated = ps.some((p) => !BONDING_DEXES.has(p.dexId) && (p.liquidity?.usd || 0) > 0);
      const paidDex = ps.some((p) => p.info && (p.info.imageUrl || p.info.header || (p.info.socials || []).length || (p.info.websites || []).length));
      coins.push({
        chain, ca, name: main.baseToken.name, symbol: main.baseToken.symbol, pair: main.pairAddress, dex: main.dexId,
        pools: ps.map((p) => p.pairAddress), migrated, migratedAt: migPairs.length ? Math.min(...migPairs.map((p) => p.pairCreatedAt || Infinity)) : null, paidDex, boosts: main.boosts?.active || 0,
        mcap: main.marketCap || main.fdv || 0, liquidity: sum((p) => p.liquidity?.usd), createdAt: Math.min(...ps.map((p) => p.pairCreatedAt || Infinity)),
        image: (ps.find((p) => p.info?.imageUrl) || main).info?.imageUrl || pumpInfo.get(ca)?.image_uri || null,
        links: (() => { const i = (ps.find((p) => p.info) || {}).info || {}; const o = {}; for (const w of i.websites || []) o.web ??= w.url; for (const x of i.socials || []) o[x.type] ??= x.url; const pf = pumpInfo.get(ca); if (pf?.twitter) o.twitter ??= pf.twitter; if (pf?.telegram) o.telegram ??= pf.telegram; if (pf?.website) o.web ??= pf.website; return o; })(), axiom: axiomUrl(main.pairAddress), dexscreener: main.url,
        vol: { m5: sum((p) => p.volume?.m5), h1: sum((p) => p.volume?.h1), h6: sum((p) => p.volume?.h6), h24: sum((p) => p.volume?.h24) },
        tx: Object.fromEntries(['m5', 'h1', 'h6', 'h24'].map((w) => [w, { buys: sum((p) => p.txns?.[w]?.buys), sells: sum((p) => p.txns?.[w]?.sells) }])),
      });
    }
  }
  return coins;
}

// Volumen 3h/8h con velas horarias de GeckoTerminal (pool principal; suma de los pools con más volumen)
export async function hourlyVolumes(coin, cfg) {
  const r = await getJson(`${GT}/pools/${coin.pair}/ohlcv/hour?limit=9&currency=usd`, { gecko: true, delay: cfg.geckoDelayMs });
  const list = r?.data?.attributes?.ohlcv_list; if (!list?.length) return null;
  // la primera vela es la hora en curso (parcial): ventana N h ≈ vela actual + N-1 anteriores
  const v = list.map((c) => c[5] || 0);
  const s = (n) => v.slice(0, n).reduce((a, b) => a + b, 0);
  // escalar al total del token si hay varios pools (ratio 6h DexScreener / 6h GT)
  const k = s(6) > 0 && coin.vol.h6 > 0 ? Math.min(3, Math.max(1, coin.vol.h6 / s(6))) : 1;
  return { h3: s(3) * k, h8: s(8) * k };
}

// ATH (market cap máximo) desde la API pública de pump.fun (ath_market_cap en USD)
export async function pumpAth(coins) {
  const missing = coins.filter((c) => !pumpInfo.get(c.ca)?.ath_market_cap);
  for (let i = 0; i < missing.length; i += 10) {
    await Promise.all(missing.slice(i, i + 10).map(async (c) => {
      const d = await getJson(`${PF}/coins-v2/${c.ca}`, { tries: 1 }); if (d?.mint) pumpInfo.set(c.ca, { ...(pumpInfo.get(c.ca) || {}), ...d });
    }));
  }
  for (const c of coins) {
    const pf = pumpInfo.get(c.ca);
    c.pumpAth = pf?.ath_market_cap ? { ath: pf.ath_market_cap, t: pf.ath_market_cap_timestamp || null } : null;
    if (!c.image && pf?.image_uri) c.image = pf.image_uri;
  }
}

// Momento del pago del perfil DEX (DexScreener orders: paymentTimestamp del tokenProfile)
export async function paidAt(ca) {
  const r = await getJson(`${DS}/orders/v1/${chain}/${ca}`, { tries: 2 });
  if (!r) return undefined; // error: reintentar otra ejecución
  const ts = (r.orders || []).filter((o) => o.type === 'tokenProfile' && o.status !== 'rejected' && o.paymentTimestamp).map((o) => o.paymentTimestamp);
  return ts.length ? Math.min(...ts) : null;
}
