"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation";
import { getOrigin, safeNext } from "@/lib/url";

export type AuthState = { error?: string; info?: string; email?: string };

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu email antes de entrar. Revisa tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con ese email. Inicia sesión.";
  if (m.includes("rate limit")) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (m.includes("password")) return "La contraseña no cumple los requisitos (mínimo 8 caracteres).";
  return "No se pudo completar. Inténtalo de nuevo.";
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: translateAuthError(error.message), email };

  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message, email };

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: translateAuthError(error.message), email };

  // Si la confirmación por email está desactivada, ya hay sesión
  if (data.session) redirect("/onboarding");

  return { info: `Te hemos enviado un email a ${parsed.data.email}. Ábrelo para confirmar tu cuenta.`, email };
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient();
  const origin = await getOrigin();
  const next = safeNext(String(formData.get("next") ?? ""));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
