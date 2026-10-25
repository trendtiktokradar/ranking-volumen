// Configuración del colector. Sin IA, solo APIs públicas gratuitas.
export default {
  chains: ['solana'],            // añadir 'base', 'bsc', 'ethereum'... cuando exista collector/chains/<chain>.js
  topN: 50,
  // Pre-filtro del colector (generoso): los filtros finos se ajustan en la web.
  minVolume24hCandidate: 15000,
  maxOhlcvRequests: 40,          // GeckoTerminal público limita fuerte (~10 req/min real): 6 s entre peticiones
  timeBudgetMs: 270000,        // corta las velas a los 4 min para no solaparse con la siguiente ejecución
  geckoDelayMs: 6000,
  // Hook de fees reales (Helius). Desactivado: activar con HELIUS_API_KEY y FEES_ENABLED=1.
  fees: { enabled: process.env.FEES_ENABLED === '1', heliusKey: process.env.HELIUS_API_KEY || '' },
};
