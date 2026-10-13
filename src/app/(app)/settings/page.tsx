import type { Metadata } from "next";
import Link from "next/link";
import { PrivacyToggle } from "@/components/profile/privacy-toggle";
import { ProfileForm } from "@/components/profile/profile-form";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { logout } from "../../(auth)/actions";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const profile = await requireProfile();

  return (
    <main className="pt-safe">
      <header className="flex h-14 items-center gap-2 px-3">
        <Link href={`/u/${profile.username}`} aria-label="Volver" className="rounded-full p-2 hover:bg-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold">Ajustes</h1>
      </header>

      <div className="flex flex-col gap-10 px-5 pt-4 pb-10">
        <section>
          <h2 className="mb-5 font-display text-2xl">Perfil</h2>
          <ProfileForm userId={profile.id} profile={profile} submitLabel="Guardar cambios" />
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl">Privacidad</h2>
          <PrivacyToggle isPrivate={profile.is_private} />
          <Link
            href="/requests"
            className="mt-2 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5 text-[15px] font-medium"
          >
            Solicitudes de seguimiento
            <span aria-hidden className="text-fg-soft">›</span>
          </Link>
        </section>

        <section>
          <h2 className="mb-4 font-display text-2xl">Apariencia</h2>
          <ThemeSwitcher />
        </section>

        <section>
          <form action={logout}>
            <Button type="submit" variant="secondary" className="w-full text-danger">
              Cerrar sesión
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
