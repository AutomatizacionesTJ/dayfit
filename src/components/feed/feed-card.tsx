import Link from "next/link";
import { Avatar } from "@/components/ui";
import type { FeedItem } from "@/lib/feed";
import { feedDateLabel } from "./date-label";

export function FeedCard({ item, today }: { item: FeedItem; today: string }) {
  const profileHref = `/u/${item.username}`;
  return (
    <article className="pb-6">
      <header className="flex items-center gap-3 px-5 pb-3">
        <Link href={profileHref} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={item.avatar_url} name={item.full_name} size={36} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold">{item.username}</span>
            <span className="block truncate text-xs text-fg-soft">{item.full_name}</span>
          </span>
        </Link>
        {item.streak > 0 && (
          <span className="rounded-full bg-flame/12 px-2 py-0.5 text-xs font-semibold text-flame tabular-nums">
            🔥 {item.streak}
          </span>
        )}
        <time dateTime={item.created_at} className="text-xs text-fg-soft">
          {feedDateLabel(item.post_date, today)}
        </time>
      </header>
      <div className="px-3">
        <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-muted">
          {item.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.url}
              alt={item.caption ?? `Outfit de @${item.username}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          )}
        </div>
      </div>
      {item.caption && (
        <p className="px-5 pt-3 text-[15px] leading-snug">
          <Link href={profileHref} className="mr-1.5 font-semibold">
            {item.username}
          </Link>
          {item.caption}
        </p>
      )}
    </article>
  );
}

export function FeedTile({ item }: { item: FeedItem }) {
  return (
    <Link
      href={`/u/${item.username}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
      aria-label={`Outfit de @${item.username}`}
    >
      {item.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover transition group-active:scale-[0.98]" />
      )}
      <span className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/65 to-transparent px-2.5 pt-8 pb-2 text-white">
        <Avatar src={item.avatar_url} name={item.full_name} size={20} />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.username}</span>
        {item.streak > 0 && <span className="text-[11px] font-semibold tabular-nums">🔥{item.streak}</span>}
      </span>
    </Link>
  );
}
