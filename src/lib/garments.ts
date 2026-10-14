/** Tipos de prenda que ofrece la app (también los que puede devolver la IA). */
export const GARMENT_CATEGORIES = [
  "Camiseta",
  "Camisa",
  "Top",
  "Jersey",
  "Sudadera",
  "Chaqueta",
  "Abrigo",
  "Vestido",
  "Falda",
  "Pantalón",
  "Vaqueros",
  "Shorts",
  "Zapatillas",
  "Zapatos",
  "Botas",
  "Sandalias",
  "Bolso",
  "Gorra o sombrero",
  "Gafas",
  "Accesorio",
  "Otro",
] as const;

export type GarmentCategory = (typeof GARMENT_CATEGORIES)[number];

/** Lo que devuelve el análisis de una prenda. Confianzas entre 0 y 1. */
export type GarmentGuess = {
  category: GarmentCategory;
  color: string;
  brand: string | null;
  confidence: { category: number; color: number; brand: number };
};

export type AnalyzeResponse =
  | { ok: true; garment: GarmentGuess | null; remaining: number }
  | { ok: false; error: string; remaining?: number };
