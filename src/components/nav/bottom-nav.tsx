"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

type Item = { href: string; label: string; icon: ReactNode; match: (p: string) => boolean };

/** Conversaciones con mensajes sin leer; se actualiza en tiempo real. */
function useUnreadCount(pathname: string) {
  const [supabase] = useState(createClient);
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      supabase.rpc("unread_conversations").then(({ data }) => {
        if (active && typeof data === "number") setCount(data);
      });
    refresh();
    const channel = supabase
      .channel("unread-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, refresh)
      .subscribe();
    window.addEventListener("dayfit:unread", refresh);
    return () => {
      active = false;
      window.removeEventListener("dayfit:unread", refresh);
      supabase.removeChannel(channel);
    };
  }, [supabase, pathname]);

  return count;
}

export function BottomNav({ username }: { username: string }) {
  const pathname = usePathname();
  const unread = useUnreadCount(pathname);
  const profileHref = `/u/${username}`;

  // Dentro de un chat la barra se oculta para dejar sitio al teclado
  if (/^\/messages\/[^/]+/.test(pathname)) return null;

  const items: Item[] = [
    { href: "/", label: "Inicio", icon: <HomeIcon />, match: (p) => p === "/" },
    { href: "/discover", label: "Descubrir", icon: <SearchIcon />, match: (p) => p.startsWith("/discover") },
    { href: "/upload", label: "Subir", icon: <PlusIcon />, match: (p) => p.startsWith("/upload") },
    { href: "/messages", label: "Mensajes", icon: <ChatIcon />, match: (p) => p.startsWith("/messages") },
    {
      href: profileHref,
      label: "Perfil",
      icon: <UserIcon />,
      match: (p) => p === profileHref || p.startsWith("/settings"),
    },
  ];

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/85 backdrop-blur-xl">
      <ul className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {items.map((item) => {
          const active = item.match(pathname);
          const isUpload = item.href === "/upload";
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={
                  isUpload
                    ? "flex h-11 w-14 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-sm transition active:scale-95"
                    : `flex h-11 w-12 flex-col items-center justify-center gap-0.5 transition ${active ? "text-fg" : "text-fg-soft"}`
                }
              >
                <span className="relative">
                  {item.icon}
                  {item.href === "/messages" && unread > 0 && (
                    <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-flame px-1 text-[10px] font-semibold text-white tabular-nums">
                      {unread > 9 ? "9+" : unread}
                      <span className="sr-only"> conversaciones sin leer</span>
                    </span>
                  )}
                </span>
                {!isUpload && (
                  <span className={`h-1 w-1 rounded-full ${active ? "bg-fg" : "bg-transparent"}`} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const iconProps = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg {...iconProps} strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}
