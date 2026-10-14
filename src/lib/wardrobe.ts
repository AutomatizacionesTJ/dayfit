import "server-only";
import { createClient } from "@/lib/supabase/server";
import { withSignedUrls } from "@/lib/outfits";

export async function getWardrobe() {
  const supabase = await createClient();
  const { data } = await supabase.from("wardrobe_items").select("*").order("created_at", { ascending: false });
  return withSignedUrls(data ?? [], "wardrobe");
}

export async function getWardrobeItem(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("wardrobe_items").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [item] = await withSignedUrls([data], "wardrobe");
  return item;
}

export async function getAiRemaining() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("ai_quota_remaining");
  return typeof data === "number" ? data : 0;
}
