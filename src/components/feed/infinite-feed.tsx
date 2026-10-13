"use client";

import { useEffect, useRef, useState } from "react";
import { loadFeedPage } from "@/app/(app)/feed-actions";
import type { FeedCursor, FeedItem, FeedKind, FeedPage } from "@/lib/feed";
import { FeedCard, FeedTile } from "./feed-card";

export function InfiniteFeed({ kind, initial, today }: { kind: FeedKind; initial: FeedPage; today: string }) {
  const [items, setItems] = useState<FeedItem[]>(initial.items);
  const [next, setNext] = useState<FeedCursor | null>(initial.next);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  async function loadMore() {
    if (!next || loading.current) return;
    loading.current = true;
    try {
      const page = await loadFeedPage(kind, next);
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...page.items.filter((i) => !seen.has(i.id))];
      });
      setNext(page.next);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      loading.current = false;
    }
  }

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || failed) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), {
      rootMargin: "800px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
    // loadMore lee `next` del render actual; el observer se recrea cuando cambia
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next, failed]);

  return (
    <>
      {kind === "home" ? (
        <div>
          {items.map((item) => (
            <FeedCard key={item.id} item={item} today={today} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 px-3">
          {items.map((item) => (
            <FeedTile key={item.id} item={item} />
          ))}
        </div>
      )}
      {next && (
        <div ref={sentinel} className="flex justify-center py-8">
          {failed ? (
            <button type="button" onClick={loadMore} className="rounded-full bg-muted px-4 py-2 text-sm">
              Reintentar
            </button>
          ) : (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-fg" aria-label="Cargando" />
          )}
        </div>
      )}
    </>
  );
}
