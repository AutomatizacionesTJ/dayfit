import type { Metadata } from "next";
import { InfiniteFeed } from "@/components/feed/infinite-feed";
import { UserSearch } from "@/components/feed/user-search";
import { PageHeader } from "@/components/page-header";
import { requireProfile } from "@/lib/auth";
import { todayIn } from "@/lib/dates";
import { getFeedPage } from "@/lib/feed";

export const metadata: Metadata = { title: "Descubrir" };

export default async function DiscoverPage() {
  const profile = await requireProfile();
  const feed = await getFeedPage("discover");

  return (
    <>
      <PageHeader title="Descubrir" />
      <UserSearch>
        {feed.items.length > 0 ? (
          <div className="pb-6">
            <InfiniteFeed
              key={feed.items[0].id}
              kind="discover"
              initial={feed}
              today={todayIn(profile.timezone)}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center px-8 py-20 text-center">
            <p className="font-display text-3xl">Nada nuevo por aquí</p>
            <p className="mt-2 max-w-xs text-sm text-fg-soft">
              Ya sigues a todas las cuentas públicas con outfits, o aún nadie ha subido el suyo. Busca a alguien por su
              nombre de usuario.
            </p>
          </div>
        )}
      </UserSearch>
    </>
  );
}
