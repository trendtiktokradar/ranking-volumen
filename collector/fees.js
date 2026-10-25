// Hook para fees reales pagadas (prioridad + propinas) vía Helius. DESACTIVADO en v1.
// Debe devolver { feesUsd, feesRatio } (fees / volumen) o null. La web filtra por feesRatio si existe.
export async function getFees(coin, cfg) {
  if (!cfg.fees.enabled || !cfg.fees.heliusKey) return null;
  // TODO v2: consultar transacciones del pool en https://api.helius.xyz/v0/addresses/<pool>/transactions?api-key=...
  // sumar fee + tips de las últimas N horas y dividir por el volumen de la ventana.
  return null;
}
