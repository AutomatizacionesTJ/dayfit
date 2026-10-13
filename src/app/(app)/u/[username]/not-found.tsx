import { ButtonLink } from "@/components/ui";

export default function ProfileNotFound() {
  return (
    <main className="flex flex-col items-center px-8 py-24 text-center">
      <p className="font-display text-3xl">Usuario no encontrado</p>
      <p className="mt-2 text-sm text-fg-soft">Puede que el nombre de usuario haya cambiado.</p>
      <ButtonLink href="/discover" variant="secondary" className="mt-6">
        Buscar gente
      </ButtonLink>
    </main>
  );
}
