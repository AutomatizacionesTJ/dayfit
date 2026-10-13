import type { Metadata } from "next";
import Link from "next/link";
import { RequestActions } from "@/components/profile/request-actions";
import { Avatar } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getPendingRequests } from "@/lib/follows";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function RequestsPage() {
  const me = await requireProfile();
  const requests = await getPendingRequests(me.id);

  return (
    <main className="pt-safe">
      <header className="flex h-14 items-center gap-2 px-3">
        <Link href={`/u/${me.username}`} aria-label="Volver" className="rounded-full p-2 hover:bg-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="text-base font-semibold">Solicitudes de seguimiento</h1>
      </header>

      {requests.length === 0 ? (
        <div className="px-8 py-24 text-center">
          <p className="font-display text-3xl">Todo al día</p>
          <p className="mt-2 text-sm text-fg-soft">
            {me.is_private
              ? "Cuando alguien pida seguirte, aparecerá aquí."
              : "Tu cuenta es pública: quien te sigue lo hace al instante."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line px-5 pb-10">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-3">
              <Link href={`/u/${r.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar src={r.avatar_url} name={r.full_name} size={44} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{r.full_name}</span>
                  <span className="block truncate text-xs text-fg-soft">@{r.username}</span>
                </span>
              </Link>
              <RequestActions followerId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
