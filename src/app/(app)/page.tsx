import Link from "next/link";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { PageHeader } from "@/components/page-header";
import { StreakBadge } from "@/components/outfit/streak-badge";
import { ButtonLink } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { effectiveStreak, todayIn } from "@/lib/dates";
import { getFeedPage } from "@/lib/feed";

export default async function HomePage() {
  const profile = await requireProfile();
  const today = todayIn(profile.timezone);
  const postedToday = profile.last_post_date === today;
  const streak = effectiveStreak(profile);
  const feed = await getFeedPage("home");

  return (
    <>
      <PageHeader title="dayfit" action={<StreakBadge streak={streak} />} />
      {!postedToday && (
        <Link
          href="/upload"
          className="mx-5 mt-2 mb-6 flex items-center justify-between gap-4 rounded-2xl bg-accent px-5 py-4 text-accent-fg transition active:scale-[0.99]"
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

      {feed.items.length > 0 ? (
        <div className="pt-2">
          <InfiniteFeed key={feed.items[0].id} kind="home" initial={feed} today={today} />
        </div>
      ) : (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <p className="font-display text-3xl">Tu feed está vacío</p>
          <p className="mt-2 max-w-xs text-sm text-fg-soft">
            Aquí verás los outfits de la gente que sigues. Encuentra estilos que te inspiren en Descubrir.
          </p>
          <ButtonLink href="/discover" className="mt-6">
            Descubrir gente
          </ButtonLink>
        </div>
      )}
    </>
  );
}
