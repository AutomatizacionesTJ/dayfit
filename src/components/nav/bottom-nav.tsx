"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Item = { href: string; label: string; icon: ReactNode; match: (p: string) => boolean };

export function BottomNav({ username }: { username: string }) {
  const pathname = usePathname();
  const profileHref = `/u/${username}`;

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
                {item.icon}
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
