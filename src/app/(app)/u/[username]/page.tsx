import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, ButtonLink } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function getProfile(username: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, bio, is_private")
    .eq("username", decodeURIComponent(username).toLowerCase())
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${decodeURIComponent(username)}` };
}

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const [me, profile] = await Promise.all([requireProfile(), getProfile(username)]);
  if (!profile) notFound();
  const isMe = me.id === profile.id;

  return (
    <main className="pt-safe">
      <header className="flex h-14 items-center justify-between px-5">
        <span className="flex items-center gap-1.5 text-base font-semibold">
          @{profile.username}
          {profile.is_private && <LockIcon />}
        </span>
        {isMe && (
          <Link href="/settings" aria-label="Ajustes" className="-mr-2 rounded-full p-2 hover:bg-muted">
            <GearIcon />
          </Link>
        )}
      </header>

      <section className="px-5 pt-2">
        <div className="flex items-center gap-5">
          <Avatar src={profile.avatar_url} name={profile.full_name} size={88} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl leading-tight">{profile.full_name}</h1>
            <p className="text-sm text-fg-soft">@{profile.username}</p>
          </div>
        </div>

        {profile.bio && <p className="mt-4 text-[15px] leading-relaxed whitespace-pre-line">{profile.bio}</p>}

        <div className="mt-5 flex gap-2">
          {isMe ? (
            <ButtonLink href="/settings" variant="secondary" className="h-10 flex-1">
              Editar perfil
            </ButtonLink>
          ) : (
            <p className="text-xs text-fg-soft">Seguir y enviar mensaje llegan en las fases 3 y 5.</p>
          )}
        </div>
      </section>

      <section className="mt-8 border-t border-line px-5 py-10 text-center text-sm text-fg-soft">
        La racha 🔥 y los outfits de los últimos 7 días aparecerán aquí en la fase 2.
      </section>
    </main>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-label="Cuenta privada">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}
