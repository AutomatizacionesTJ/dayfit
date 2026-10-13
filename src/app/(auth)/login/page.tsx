import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  google: "No se pudo iniciar sesión con Google.",
  callback: "El enlace no es válido o ha caducado. Vuelve a intentarlo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  return (
    <AuthForm
      mode="login"
      next={typeof next === "string" ? next : undefined}
      initialError={typeof error === "string" ? ERRORS[error] : undefined}
      googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"}
    />
  );
}
