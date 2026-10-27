# Ranking Volumen

Ranking de volumen de memecoins de Solana en 3 columnas (Sin migrar · DEX pagado · Migradas), ventanas 3h/6h/8h/24h. Sin IA, solo APIs públicas gratuitas (DexScreener + GeckoTerminal).

## Arquitectura
- `collector/` – Node 20 sin dependencias. `node collector/index.js` descubre candidatas, las enriquece y escribe `public/data/coins.json` + `coins.csv`.
  - `chains/solana.js` – lógica de Solana. Para EVM: crear `chains/base.js` etc. con `discover/enrich/hourlyVolumes` y añadirlo a `config.js`.
  - `fees.js` – hook para fees reales (Helius), desactivado.
- `.github/workflows/collect.yml` – GitHub Actions cada 5 min; publica los datos en la rama `data` (sin historial, force-push).
- `public/` – web estática (Vercel). Lee `DATA_URL` de `public/config.js` (raw.githubusercontent de la rama `data`), así Vercel no redespliega en cada actualización.

## Local
```
node collector/index.js
npx serve public -l 3000   # o: python3 -m http.server 3000 -d public
```
Autor de los commits: en GitHub → Settings → Variables, `GIT_AUTHOR_NAME` / `GIT_AUTHOR_EMAIL` (opcional; por defecto el bot de GitHub Actions).

## Botón «Actualizar»
La web llama a `/api/refresh` (función serverless de Vercel en `api/refresh.js`), que lanza el workflow `collect.yml`.
Necesita en Vercel → Settings → Environment Variables: `GH_DISPATCH_TOKEN` = token de GitHub con permiso
**Actions: Read and write** sobre este repo. Cooldown: no relanza si hay una ejecución en marcha o de hace <10 min.
