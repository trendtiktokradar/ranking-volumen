// Configuración del colector. Sin IA, solo APIs públicas gratuitas.
export default {
  chains: ['solana'],            // añadir 'base', 'bsc', 'ethereum'... cuando exista collector/chains/<chain>.js
  topN: 50,
  pumpPages: 4,
  pumpGradPages: 30,            // graduadas (complete=true) recientes                 // páginas de 50 de la API de pump.fun por orden
  pumpMinMcap: 8000,
  pumpBondingPages: 40,         // en curva: 40 páginas por last_trade y por creación (la API no pasa de offset ~2000)
  bondingMinMcap: 5000,         // en curva: MC actual mínimo para ser candidata...
  bondingMinAth: 8000,          // ...o ATH mínimo (USD), aunque ahora haya caído
  gtPumpPages: 10,              // GeckoTerminal pump-fun (bonding) top volumen 24h, 20 por página (máx. 10)
  gtPumpTxPages: 5,             // GeckoTerminal pump-fun top nº de operaciones 24h
  historyHours: 9,              // historial para 3h/8h exactas (24h y 6h vienen de DexScreener)
  // Pre-filtro del colector (generoso): los filtros finos se ajustan en la web.
  minVolume24hCandidate: 2000,
  maxOhlcvRequests: 12,
  maxOrdersRequests: 170,         // DexScreener orders (~60 req/min): fecha de pago del DEX          // GeckoTerminal público limita fuerte (~10 req/min real): 6 s entre peticiones
  timeBudgetMs: 360000,        // corta las velas a los 4 min para no solaparse con la siguiente ejecución
  geckoDelayMs: 6000,
  chartDelayMs: 2600,           // gráficas DEX Paid: GeckoTerminal ~23 req/min
  chartHours: 24,               // gráficas para coins que pagaron DEX en las últimas 24 h
  chartReuseMin: 30,            // reutilizar la gráfica si se descargó hace menos de 30 min
  chartDeadlineMs: 510000,      // dejar de pedir gráficas a los 8,5 min (el resto las pide el navegador)
  // Hook de fees reales (Helius). Desactivado: activar con HELIUS_API_KEY y FEES_ENABLED=1.
  fees: { enabled: process.env.FEES_ENABLED === '1', heliusKey: process.env.HELIUS_API_KEY || '' },
};
