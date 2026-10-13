import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />;
}
