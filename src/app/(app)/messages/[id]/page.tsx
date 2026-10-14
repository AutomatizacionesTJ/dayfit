import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatRoom } from "@/components/chat/chat-room";
import { Avatar } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getConversation } from "@/lib/chat";

export const metadata: Metadata = { title: "Chat" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ChatPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireProfile();
  const conversation = await getConversation(id, me.id);
  if (!conversation) notFound();
  const { other } = conversation;

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-lg flex-col bg-bg">
      <header className="pt-safe border-b border-line bg-bg/85 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-2 px-2">
          <Link href="/messages" aria-label="Volver" className="rounded-full p-2 hover:bg-muted">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </Link>
          <Link href={`/u/${other.username}`} className="flex min-w-0 items-center gap-2.5">
            <Avatar src={other.avatar_url} name={other.full_name} size={34} />
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-semibold">{other.full_name}</span>
              <span className="block truncate text-xs text-fg-soft">@{other.username}</span>
            </span>
          </Link>
        </div>
      </header>
      <ChatRoom
        key={conversation.id}
        conversationId={conversation.id}
        meId={me.id}
        timeZone={me.timezone}
        initialMessages={conversation.messages}
        initialHasMore={conversation.hasMore}
        canSend={conversation.canSend}
        otherName={other.full_name}
      />
    </div>
  );
}
