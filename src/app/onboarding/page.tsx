import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { Logo } from "@/components/ui";
import { getMyProfile, getUserId } from "@/lib/auth";
import { logout } from "../(auth)/actions";

export const metadata: Metadata = { title: "Crea tu perfil" };

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  if (await getMyProfile()) redirect("/");

  return (
    <main className="pt-safe mx-auto w-full max-w-sm px-6 py-10">
      <Logo className="text-3xl" />
      <h1 className="mt-6 font-display text-4xl leading-tight">Crea tu perfil</h1>
      <p className="mt-2 mb-8 text-sm text-fg-soft">Así te verán los demás. Podrás cambiarlo cuando quieras.</p>
      <ProfileForm userId={userId} submitLabel="Empezar" />
      <form action={logout} className="mt-6 text-center">
        <button className="text-sm text-fg-soft underline underline-offset-4">Cerrar sesión</button>
      </form>
    </main>
  );
}
