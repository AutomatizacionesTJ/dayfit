"use server";

import { isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { credentialsSchema } from "@/lib/validation";
import { getOrigin, safeNext } from "@/lib/url";

export type AuthState = { error?: string; info?: string; email?: string };

function translateAuthError(error: AuthError) {
  console.error("[auth]", error.code ?? error.name, error.status, error.message);

  if (isAuthRetryableFetchError(error) || error.status === 0)
    return "No se pudo conectar con Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL en Vercel y vuelve a desplegar.";

  const m = error.message.toLowerCase();
  if (m.includes("invalid api key") || m.includes("no api key"))
    return "La clave de Supabase no es válida. Revisa NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en Vercel y vuelve a desplegar.";

  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Confirma tu email antes de entrar. Revisa tu bandeja de entrada.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese email. Inicia sesión.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Demasiados intentos o emails enviados. Espera un rato y vuelve a probar.";
    case "weak_password":
      return "La contraseña es demasiado débil. Usa al menos 8 caracteres.";
    case "email_address_invalid":
      return "Supabase no acepta ese email. Prueba con otro.";
    case "signup_disabled":
    case "email_provider_disabled":
      return "El registro con email está desactivado en Supabase (Authentication → Sign In / Providers → Email).";
  }
  if (m.includes("sending confirmation email") || m.includes("error sending"))
    return "Supabase no pudo enviar el email de confirmación. Desactiva \"Confirm email\" en Supabase o configura un SMTP.";

  return `No se pudo completar (${error.code ?? error.status ?? "error"}: ${error.message}).`;
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
  if (error) return { error: translateAuthError(error), email };

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
  if (error) return { error: translateAuthError(error), email };

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
