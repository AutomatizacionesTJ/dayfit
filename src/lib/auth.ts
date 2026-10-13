import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/database.types";

/** Usuario autenticado (verificado con el JWT) o null. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

/** Perfil del usuario actual, o null si aún no completó el onboarding. */
export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data;
});

/** Exige sesión y perfil completo; si no, redirige. */
export async function requireProfile(): Promise<Profile> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const profile = await getMyProfile();
  if (!profile) redirect("/onboarding");
  return profile;
}
