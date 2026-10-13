const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const rawKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

function normalizeUrl(value: string) {
  try {
    const url = new URL(value);
    // Acepta también la URL copiada con /rest/v1 u otra ruta detrás
    return url.protocol === "http:" || url.protocol === "https:" ? url.origin : "";
  } catch {
    return "";
  }
}

export const SUPABASE_URL = normalizeUrl(rawUrl);
export const SUPABASE_PUBLISHABLE_KEY = rawKey;

/** Describe qué falta en la configuración, o null si todo está bien. */
export function getConfigProblem(): string | null {
  if (!rawUrl) return "Falta la variable NEXT_PUBLIC_SUPABASE_URL.";
  if (!SUPABASE_URL)
    return "NEXT_PUBLIC_SUPABASE_URL no es una URL válida. Debe ser como https://xxxx.supabase.co";
  if (!rawKey) return "Falta la variable NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";
  return null;
}
