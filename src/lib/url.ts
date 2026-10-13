import "server-only";
import { headers } from "next/headers";

/** Origen público de la app (respeta proxies como Vercel). */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Evita redirecciones abiertas: solo rutas relativas internas. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
