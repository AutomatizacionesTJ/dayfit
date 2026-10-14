import Anthropic from "@anthropic-ai/sdk";
import { aiConfigured, analyzeGarment, type ImageMediaType } from "@/lib/ai";
import { getUserId } from "@/lib/auth";
import type { AnalyzeResponse } from "@/lib/garments";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MAX_BYTES = 3 * 1024 * 1024;
const TYPES: ImageMediaType[] = ["image/webp", "image/jpeg", "image/png"];

function reply(body: AnalyzeResponse, status = 200) {
  return Response.json(body, { status });
}

/** Analiza la foto de una prenda con IA. Gasta uno de los análisis diarios del usuario. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return reply({ ok: false, error: "Inicia sesión para usar la IA." }, 401);
  if (!aiConfigured()) return reply({ ok: false, error: "La IA no está configurada en esta app." }, 503);

  let image: File | null = null;
  try {
    const value = (await request.formData()).get("image");
    image = value instanceof File ? value : null;
  } catch {}
  if (!image || !TYPES.includes(image.type as ImageMediaType) || image.size > MAX_BYTES) {
    return reply({ ok: false, error: "La foto no es válida (WebP, JPEG o PNG de menos de 3 MB)." }, 400);
  }

  // El límite se gasta antes de llamar a la IA, en la base de datos (no se puede saltar)
  const supabase = await createClient();
  const { data: remaining, error } = await supabase.rpc("consume_ai_quota");
  if (error) {
    console.error("[analyze] quota", error);
    return reply({ ok: false, error: "No se pudo comprobar tu límite de IA." }, 500);
  }
  if (remaining < 0) {
    return reply({ ok: false, error: "Ya has usado tus análisis con IA de hoy. Mañana tendrás más.", remaining: 0 }, 429);
  }

  try {
    const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
    const garment = await analyzeGarment(base64, image.type as ImageMediaType);
    return reply({ ok: true, garment, remaining });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("[analyze] ANTHROPIC_API_KEY no válida");
    else if (err instanceof Anthropic.RateLimitError) console.error("[analyze] límite de la API de Claude", err.message);
    else if (err instanceof Anthropic.APIError) console.error(`[analyze] API ${err.status}`, err.message);
    else console.error("[analyze]", err);
    return reply({ ok: false, error: "La IA no ha respondido. Rellena los datos a mano.", remaining }, 502);
  }
}
