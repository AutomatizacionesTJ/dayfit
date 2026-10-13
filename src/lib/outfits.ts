import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Outfit } from "@/lib/supabase/database.types";

export type WithUrl<T> = T & { url: string | null };
export type OutfitWithUrl = WithUrl<Outfit>;

const SIGNED_URL_TTL = 60 * 60; // 1 hora

/** Añade una URL firmada a cada outfit (el bucket es privado). */
export async function withSignedUrls<T extends { image_path: string }>(outfits: T[]): Promise<WithUrl<T>[]> {
  if (outfits.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("outfits")
    .createSignedUrls(
      outfits.map((o) => o.image_path),
      SIGNED_URL_TTL,
    );
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return outfits.map((o) => ({ ...o, url: byPath.get(o.image_path) ?? null }));
}

/** Outfits de un usuario desde una fecha (incluida). RLS decide si se pueden ver. */
export async function getOutfitsSince(userId: string, since: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    .select("*")
    .eq("user_id", userId)
    .gte("post_date", since)
    .order("post_date", { ascending: false });
  return withSignedUrls(data ?? []);
}
