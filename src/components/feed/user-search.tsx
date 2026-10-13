"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { searchUsers } from "@/app/(app)/feed-actions";
import { Avatar } from "@/components/ui";
import type { ProfileHit } from "@/lib/supabase/database.types";

/** Buscador de usuarios. Mientras no hay texto, muestra `children` (el feed de Descubrir). */
export function UserSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; hits: ProfileHit[] } | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const hits = await searchUsers(q);
        if (!cancelled) setResults({ q, hits });
      } catch {
        if (!cancelled) setResults({ q, hits: [] });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q]);

  const hits = results?.q === q ? results.hits : null;

  return (
    <>
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-20 bg-bg/85 px-5 pb-3 backdrop-blur-xl">
        <label className="flex h-11 items-center gap-2 rounded-full bg-muted px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fg-soft" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar usuarios"
            aria-label="Buscar usuarios"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            className="h-full w-full bg-transparent text-base outline-none placeholder:text-fg-soft"
          />
        </label>
      </div>

      {!q ? (
        children
      ) : hits === null ? (
        <p className="px-5 py-6 text-sm text-fg-soft">Buscando…</p>
      ) : hits.length === 0 ? (
        <p className="px-5 py-6 text-sm text-fg-soft">No hay nadie con «{q}».</p>
      ) : (
        <ul className="px-5 pb-10">
          {hits.map((p) => (
            <li key={p.id}>
              <Link href={`/u/${p.username}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted">
                <Avatar src={p.avatar_url} name={p.full_name} size={44} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-sm font-semibold">{p.username}</span>
                  <span className="block truncate text-sm text-fg-soft">{p.full_name}</span>
                </span>
                {p.is_private && <span className="text-xs text-fg-soft">Privada</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
