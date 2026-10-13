"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type FollowResult = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function session() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return { userId, supabase: await createClient() };
}

function done(error: { code?: string; message: string } | null, what: string): FollowResult {
  if (error) {
    console.error(`[${what}]`, error);
    return { error: "No se pudo completar. Inténtalo de nuevo." };
  }
  revalidatePath("/", "layout");
  return {};
}

/** Seguir (cuenta pública) o enviar solicitud (cuenta privada). El estado lo decide la BD. */
export async function follow(targetId: string): Promise<FollowResult> {
  const { userId, supabase } = await session();
  if (!UUID.test(targetId) || targetId === userId) return { error: "Usuario no válido." };
  const { error } = await supabase.from("follows").insert({ following_id: targetId });
  // 23505: ya lo seguía (doble toque); no es un error para el usuario
  return done(error?.code === "23505" ? null : error, "follow");
}

/** Dejar de seguir o cancelar una solicitud enviada. */
export async function unfollow(targetId: string): Promise<FollowResult> {
  const { userId, supabase } = await session();
  if (!UUID.test(targetId)) return { error: "Usuario no válido." };
  const { error } = await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", targetId);
  return done(error, "unfollow");
}

export async function acceptRequest(followerId: string): Promise<FollowResult> {
  const { userId, supabase } = await session();
  if (!UUID.test(followerId)) return { error: "Usuario no válido." };
  const { error } = await supabase
    .from("follows")
    .update({ status: "accepted" })
    .eq("follower_id", followerId)
    .eq("following_id", userId)
    .eq("status", "pending");
  return done(error, "acceptRequest");
}

/** Rechazar una solicitud o eliminar a un seguidor. */
export async function removeFollower(followerId: string): Promise<FollowResult> {
  const { userId, supabase } = await session();
  if (!UUID.test(followerId)) return { error: "Usuario no válido." };
  const { error } = await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", userId);
  return done(error, "removeFollower");
}

/** Cambiar la cuenta entre pública y privada. Al pasar a pública, la BD acepta las solicitudes. */
export async function setPrivacy(isPrivate: boolean): Promise<FollowResult> {
  const { userId, supabase } = await session();
  const { error } = await supabase.from("profiles").update({ is_private: isPrivate === true }).eq("id", userId);
  return done(error, "setPrivacy");
}
