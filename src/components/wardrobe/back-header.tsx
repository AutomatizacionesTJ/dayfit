import Link from "next/link";
import type { ReactNode } from "react";

export function BackHeader({ href, title, action }: { href: string; title: string; action?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link href={href} aria-label="Volver" className="rounded-full p-2 hover:bg-muted">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <h1 className="flex-1 text-base font-semibold">{title}</h1>
        {action}
      </div>
    </header>
  );
}
