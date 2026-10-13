import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StreakBadge } from "@/components/outfit/streak-badge";
import { UploadForm } from "@/components/outfit/upload-form";
import { Button } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { effectiveStreak, longDate, todayIn } from "@/lib/dates";
import { getOutfitsSince } from "@/lib/outfits";
import { deleteOutfit } from "./actions";

export const metadata: Metadata = { title: "Subir outfit" };

export default async function UploadPage({ searchParams }: PageProps<"/upload">) {
  const profile = await requireProfile();
  const { nuevo } = await searchParams;
  const today = todayIn(profile.timezone);
  const [todayOutfit] = await getOutfitsSince(profile.id, today);
  const streak = effectiveStreak(profile);

  return (
    <>
      <PageHeader title="Hoy" action={<StreakBadge streak={streak} />} />
      <p className="-mt-1 mb-4 px-5 text-sm text-fg-soft first-letter:uppercase">{longDate(today)}</p>

      {todayOutfit ? (
        <section className="flex flex-col gap-4 px-5 pb-8">
          {nuevo && (
            <div className="rounded-2xl bg-flame/12 px-4 py-3 text-sm text-flame">
              ¡Publicado! {streak === 1 ? "Empiezas tu racha 🔥" : `Llevas ${streak} días seguidos 🔥`}
            </div>
          )}
          <figure className="overflow-hidden rounded-3xl bg-muted">
            {todayOutfit.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={todayOutfit.url} alt={todayOutfit.caption ?? "Tu outfit de hoy"} className="aspect-[4/5] w-full object-cover" />
            )}
          </figure>
          {todayOutfit.caption && <p className="text-[15px] leading-relaxed">{todayOutfit.caption}</p>}
          <p className="text-sm text-fg-soft">Ya has subido tu outfit de hoy. Vuelve mañana para seguir con tu racha.</p>
          <form action={deleteOutfit}>
            <input type="hidden" name="id" value={todayOutfit.id} />
            <Button type="submit" variant="ghost" className="w-full text-fg-soft">
              Borrar y subir otra
            </Button>
          </form>
        </section>
      ) : (
        <UploadForm userId={profile.id} />
      )}
    </>
  );
}
