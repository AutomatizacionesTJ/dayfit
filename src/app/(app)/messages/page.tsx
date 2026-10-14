import type { Metadata } from "next";
import Link from "next/link";
import { RealtimeRefresh } from "@/components/chat/realtime-refresh";
import { shortWhen } from "@/components/chat/format";
import { PageHeader } from "@/components/page-header";
import { Avatar, ButtonLink } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getMyConversations } from "@/lib/chat";

export const metadata: Metadata = { title: "Mensajes" };

export default async function MessagesPage() {
  const me = await requireProfile();
  const conversations = await getMyConversations();

  return (
    <>
      <PageHeader title="Mensajes" />
      <RealtimeRefresh />
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <p className="font-display text-3xl">Sin mensajes</p>
          <p className="mt-2 max-w-xs text-sm text-fg-soft">
            Entra en el perfil de alguien y pulsa «Mensaje» para empezar a hablar.
          </p>
          <ButtonLink href="/discover" className="mt-6">
            Buscar gente
          </ButtonLink>
        </div>
      ) : (
        <ul className="px-3 pb-6">
          {conversations.map((c) => {
            const unread = c.unread > 0;
            return (
              <li key={c.id}>
                <Link href={`/messages/${c.id}`} className="flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-muted">
                  <Avatar src={c.avatar_url} name={c.full_name} size={52} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[15px] ${unread ? "font-semibold" : "font-medium"}`}>{c.full_name}</span>
                      <time dateTime={c.last_message_at} className={`shrink-0 text-xs ${unread ? "text-fg" : "text-fg-soft"}`}>
                        {shortWhen(c.last_message_at, me.timezone)}
                      </time>
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className={`truncate text-sm ${unread ? "font-medium text-fg" : "text-fg-soft"}`}>
                        {c.last_sender_id === me.id && "Tú: "}
                        {c.last_body}
                      </span>
                      {unread && (
                        <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-fg tabular-nums">
                          {c.unread}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
