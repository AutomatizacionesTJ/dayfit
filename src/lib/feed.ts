import "server-only";
import { withSignedUrls, type WithUrl } from "@/lib/outfits";
import { createClient } from "@/lib/supabase/server";
import type { FeedRow } from "@/lib/supabase/database.types";

export type FeedKind = "home" | "discover";
export type FeedItem = WithUrl<FeedRow>;
export type FeedCursor = { at: string; id: string };
export type FeedPage = { items: FeedItem[]; next: FeedCursor | null };

const PAGE_SIZE: Record<FeedKind, number> = { home: 8, discover: 18 };

/** Una página del feed. Las funciones SQL aplican RLS: solo devuelven lo que puedes ver. */
export async function getFeedPage(kind: FeedKind, cursor: FeedCursor | null = null): Promise<FeedPage> {
  const supabase = await createClient();
  const limit = PAGE_SIZE[kind];
  const { data, error } = await supabase.rpc(kind === "home" ? "home_feed" : "discover_feed", {
    p_before_at: cursor?.at,
    p_before_id: cursor?.id,
    p_limit: limit,
  });
  if (error) {
    console.error(`[getFeedPage:${kind}]`, error);
    return { items: [], next: null };
  }
  const rows = data ?? [];
  const last = rows.at(-1);
  return {
    items: await withSignedUrls(rows),
    next: rows.length === limit && last ? { at: last.created_at, id: last.id } : null,
  };
}
