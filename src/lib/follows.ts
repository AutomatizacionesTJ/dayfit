import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FollowStatus } from "@/lib/supabase/database.types";

/** Estado de mi seguimiento hacia otra cuenta: null si no la sigo. */
export async function getFollowStatus(meId: string, otherId: string): Promise<FollowStatus | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("status")
    .eq("follower_id", meId)
    .eq("following_id", otherId)
    .maybeSingle();
  return data?.status ?? null;
}

export async function getFollowCounts(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("follow_counts", { p_user: userId }).single();
  return { followers: data?.followers ?? 0, following: data?.following ?? 0 };
}

export async function countPendingRequests(meId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("follows")
    .select("follower_id", { count: "exact", head: true })
    .eq("following_id", meId)
    .eq("status", "pending");
  return count ?? 0;
}

/** Solicitudes pendientes que he recibido, con el perfil de quien la envía. */
export async function getPendingRequests(meId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("created_at, follower:profiles!follows_follower_id_fkey(id, username, full_name, avatar_url)")
    .eq("following_id", meId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []).flatMap((r) => (r.follower ? [{ ...r.follower, requested_at: r.created_at }] : []));
}
