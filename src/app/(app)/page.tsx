import Link from "next/link";
import { ComingSoon, PageHeader } from "@/components/page-header";
import { StreakBadge } from "@/components/outfit/streak-badge";
import { requireProfile } from "@/lib/auth";
import { effectiveStreak, todayIn } from "@/lib/dates";

export default async function HomePage() {
  const profile = await requireProfile();
  const postedToday = profile.last_post_date === todayIn(profile.timezone);
  const streak = effectiveStreak(profile);

  return (
    <>
      <PageHeader title="dayfit" action={<StreakBadge streak={streak} />} />
      {!postedToday && (
        <Link
          href="/upload"
          className="mx-5 mt-2 flex items-center justify-between gap-4 rounded-2xl bg-accent px-5 py-4 text-accent-fg transition active:scale-[0.99]"
        >
          <span>
            <span className="block font-display text-2xl leading-tight">Sube tu outfit de hoy</span>
            <span className="text-sm opacity-75">
              {streak > 0 ? `No pierdas tu racha de ${streak} 🔥` : "Empieza tu racha 🔥"}
            </span>
          </span>
          <span aria-hidden className="text-2xl">
            →
          </span>
        </Link>
      )}
      <ComingSoon title="Tu feed" text="Aquí verás los outfits de hoy de la gente a la que sigues (fase 4)." />
    </>
  );
}
