const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { sleep };
let lastGecko = 0;
export async function getJson(url, { gecko = false, delay = 2100, tries = 3 } = {}) {
  for (let i = 0; i < tries; i++) {
    if (gecko) { const w = lastGecko + delay - Date.now(); if (w > 0) await sleep(w); lastGecko = Date.now(); }
    try {
      const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'ranking-volumen/1.0' } });
      if (r.status === 429) { console.warn('429', url.slice(0, 90)); await sleep(20000); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i === tries - 1) { console.warn('fallo', url, e.message); return null; } await sleep(2000); }
  }
  return null;
}
