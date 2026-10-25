// Configuración del colector. Sin IA, solo APIs públicas gratuitas.
export default {
  chains: ['solana'],            // añadir 'base', 'bsc', 'ethereum'... cuando exista collector/chains/<chain>.js
  topN: 50,
  pumpPages: 4,
  pumpGradPages: 12,            // graduadas (complete=true) recientes                 // páginas de 50 de la API de pump.fun por orden
  pumpMinMcap: 8000,
  historyHours: 9,              // historial para 3h/8h exactas (24h y 6h vienen de DexScreener)
  // Pre-filtro del colector (generoso): los filtros finos se ajustan en la web.
  minVolume24hCandidate: 2000,
  maxOhlcvRequests: 12,
  maxOrdersRequests: 170,         // DexScreener orders (~60 req/min): fecha de pago del DEX          // GeckoTerminal público limita fuerte (~10 req/min real): 6 s entre peticiones
  timeBudgetMs: 225000,        // corta las velas a los 4 min para no solaparse con la siguiente ejecución
  geckoDelayMs: 6000,
  // Hook de fees reales (Helius). Desactivado: activar con HELIUS_API_KEY y FEES_ENABLED=1.
  fees: { enabled: process.env.FEES_ENABLED === '1', heliusKey: process.env.HELIUS_API_KEY || '' },
};
