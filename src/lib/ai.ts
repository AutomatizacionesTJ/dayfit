import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { GARMENT_CATEGORIES, type GarmentGuess } from "@/lib/garments";

const MODEL = "claude-opus-5-5";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient() {
  // La clave solo existe en el servidor (variable ANTHROPIC_API_KEY de Vercel)
  client ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

export type ImageMediaType = "image/webp" | "image/jpeg" | "image/png";

const confidence = z.number().transform((n) => Math.min(1, Math.max(0, n)));

const GarmentResult = z.object({
  is_garment: z.boolean(),
  category: z.enum(GARMENT_CATEGORIES),
  color: z.string(),
  brand: z.string().nullable(),
  confidence: z.object({ category: confidence, color: confidence, brand: confidence }),
});

const GARMENT_SCHEMA = {
  type: "object",
  properties: {
    is_garment: { type: "boolean" },
    category: { type: "string", enum: [...GARMENT_CATEGORIES] },
    color: { type: "string" },
    brand: { anyOf: [{ type: "string" }, { type: "null" }] },
    confidence: {
      type: "object",
      properties: {
        category: { type: "number" },
        color: { type: "number" },
        brand: { type: "number" },
      },
      required: ["category", "color", "brand"],
      additionalProperties: false,
    },
  },
  required: ["is_garment", "category", "color", "brand", "confidence"],
  additionalProperties: false,
};

const GARMENT_SYSTEM = `Eres el asistente de armario de dayfit, una app de moda. Recibes la foto de una prenda o accesorio y la describes en español para catalogarla.

- category: el tipo que mejor encaje de la lista permitida.
- color: el color principal en una o dos palabras ("Azul marino", "Blanco y negro").
- brand: la marca solo si se ve un logotipo, etiqueta o diseño inconfundible; si no, null. No adivines.
- confidence: tu seguridad de 0 a 1 en cada campo (para brand null, la seguridad de que no se identifica marca).
- is_garment: false si la foto no muestra ropa, calzado ni accesorios; en ese caso rellena el resto con "Otro", "", null y confianzas 0.`;

/** Describe la prenda de la foto. Devuelve null si no es una prenda. */
export async function analyzeGarment(imageBase64: string, mediaType: ImageMediaType): Promise<GarmentGuess | null> {
  const response = await getClient().beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: GARMENT_SCHEMA } },
    system: GARMENT_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
          { type: "text", text: "Describe esta prenda." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("La IA no ha podido analizar esta foto.");
  const text = response.content.find((b) => b.type === "text")?.text;
  if (!text) throw new Error("Respuesta vacía de la IA.");

  const parsed = GarmentResult.parse(JSON.parse(text));
  if (!parsed.is_garment) return null;
  return {
    category: parsed.category,
    color: parsed.color.trim().slice(0, 40),
    brand: parsed.brand?.trim().slice(0, 60) || null,
    confidence: parsed.confidence,
  };
}
