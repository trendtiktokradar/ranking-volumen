// Historial rodante: en cada ejecución se guarda el volumen y las txns de la última hora (h1) de cada coin.
// Ventana N h = suma de h1 en las instantáneas más cercanas a ahora, ahora-1h, ..., ahora-(N-1)h (tolerancia 12 min).
import fs from 'node:fs';
const TOL = 12 * 60e3;
export function load(file) { try { return JSON.parse(fs.readFileSync(file)); } catch { return { snaps: [] }; } }
export function push(hist, coins, hours) {
  const t = Date.now();
  const c = {}; for (const x of coins) c[x.ca] = [Math.round(x.vol.h1), x.tx.h1.buys, x.tx.h1.sells];
  hist.snaps.push({ t, c });
  hist.snaps = hist.snaps.filter((s) => s.t > t - hours * 36e5 - 15 * 60e3);
  return hist;
}
export function windowFromHistory(hist, ca, n) {
  const now = hist.snaps.at(-1)?.t; if (!now) return null;
  let v = 0, b = 0, s = 0;
  for (let k = 0; k < n; k++) {
    const target = now - k * 36e5;
    let best = null; for (const sn of hist.snaps) if (Math.abs(sn.t - target) <= TOL && (!best || Math.abs(sn.t - target) < Math.abs(best.t - target))) best = sn;
    if (!best) return null;
    const e = best.c[ca] || [0, 0, 0]; // coin ausente en esa instantánea => sin volumen relevante
    if (!best.c[ca] && k > 0) return null;
    v += e[0]; b += e[1]; s += e[2];
  }
  return { vol: v, buys: b, sells: s };
}
