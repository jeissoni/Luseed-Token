/** Entidad legal y marca del proyecto */
export const BRAND_NAME = "VLP Hybrid DAO LLC";
export const BRAND_SHORT = "VLP Hybrid DAO";

/**
 * Tasa de conversión USD → COP para mostrar montos en pesos colombianos.
 * Los contratos operan en USDC (≈ USD); la UI convierte solo para visualización.
 */
export const USD_TO_COP_RATE = Number(import.meta.env.VITE_USD_TO_COP_RATE ?? "4200");
