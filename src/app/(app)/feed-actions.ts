"use server";

import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { getFeedPage, type FeedCursor, type FeedKind, type FeedPage } from "@/lib/feed";
import { createClient } from "@/lib/supabase/server";
import type { ProfileHit } from "@/lib/supabase/database.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Siguiente página del feed (scroll infinito). */
export async function loadFeedPage(kind: FeedKind, cursor: FeedCursor): Promise<FeedPage> {
  if (!(await getUserId())) redirect("/login");
  if (kind !== "home" && kind !== "discover") return { items: [], next: null };
  if (!UUID.test(cursor?.id ?? "") || Number.isNaN(Date.parse(cursor?.at ?? ""))) return { items: [], next: null };
  return getFeedPage(kind, { at: cursor.at, id: cursor.id });
}

export async function searchUsers(query: string): Promise<ProfileHit[]> {
  if (!(await getUserId())) redirect("/login");
  const q = String(query ?? "").trim().slice(0, 40);
  if (!q) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_profiles", { p_query: q, p_limit: 20 });
  if (error) console.error("[searchUsers]", error);
  return data ?? [];
}
