"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/supabase/database.types";
import { todayIn } from "@/lib/dates";
import { dateIn, dayLabel, timeIn } from "./format";

const PAGE = 50;
const MAX_LENGTH = 2000;

type Pending = { tempId: string; body: string; failed?: boolean };

/** Aviso para que la barra inferior recalcule los no leídos. */
function notifyUnreadChanged() {
  window.dispatchEvent(new Event("dayfit:unread"));
}

export function ChatRoom({
  conversationId,
  meId,
  timeZone,
  initialMessages,
  initialHasMore,
  canSend,
  otherName,
}: {
  conversationId: string;
  meId: string;
  timeZone: string;
  initialMessages: Message[];
  initialHasMore: boolean;
  canSend: boolean;
  otherName: string;
}) {
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, setPending] = useState<Pending[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const keepOffset = useRef<number | null>(null);

  function addMessages(incoming: Message[]) {
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const fresh = incoming.filter((m) => !seen.has(m.id));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });
  }

  // Marcar como leído al entrar
  useEffect(() => {
    supabase.rpc("mark_conversation_read", { p_conversation: conversationId }).then(notifyUnreadChanged);
  }, [supabase, conversationId]);

  // Mensajes nuevos en tiempo real (Realtime solo envía lo que RLS te deja ver)
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const message = payload.new as Message;
          addMessages([message]);
          if (message.sender_id !== meId) {
            supabase.rpc("mark_conversation_read", { p_conversation: conversationId }).then(notifyUnreadChanged);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, conversationId, meId]);

  // Mantener la vista abajo al llegar mensajes, o en su sitio al cargar anteriores
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (keepOffset.current !== null) {
      el.scrollTop = el.scrollHeight - keepOffset.current;
      keepOffset.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, pending]);

  function onScroll() {
    const el = scroller.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    const el = scroller.current;
    if (el) keepOffset.current = el.scrollHeight - el.scrollTop;
    stickToBottom.current = false;
    addMessages(data ?? []);
    setHasMore((data ?? []).length === PAGE);
    setLoadingOlder(false);
  }

  async function send(body: string, tempId: string) {
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, body })
      .select()
      .single();
    if (error || !data) {
      setPending((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, failed: true } : p)));
      return;
    }
    addMessages([data]);
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));
  }

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || !canSend) return;
    const tempId = crypto.randomUUID();
    stickToBottom.current = true;
    setPending((prev) => [...prev, { tempId, body }]);
    setDraft("");
    send(body, tempId);
  }

  function retry(p: Pending) {
    setPending((prev) => prev.map((x) => (x.tempId === p.tempId ? { ...x, failed: false } : x)));
    send(p.body, p.tempId);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter envía en ordenador; en el móvil el botón de enviar
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
      submit();
    }
  }

  const today = todayIn(timeZone);

  return (
    <>
      <div ref={scroller} onScroll={onScroll} className="flex-1 overflow-y-auto overscroll-contain px-3 py-4">
        {hasMore && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="rounded-full bg-muted px-4 py-1.5 text-xs font-medium disabled:opacity-60"
            >
              {loadingOlder ? "Cargando…" : "Ver mensajes anteriores"}
            </button>
          </div>
        )}

        {messages.length === 0 && pending.length === 0 && (
          <p className="px-6 pt-16 text-center text-sm text-fg-soft">
            {canSend ? `Saluda a ${otherName} 👋` : "Todavía no hay mensajes."}
          </p>
        )}

        <ol className="flex flex-col gap-1">
          {messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const day = dateIn(m.created_at, timeZone);
            const prev = messages[i - 1];
            const newDay = !prev || dateIn(prev.created_at, timeZone) !== day;
            const grouped = !newDay && prev?.sender_id === m.sender_id;
            return (
              <li key={m.id} className="contents">
                {newDay && (
                  <div className="my-3 text-center text-[11px] font-medium tracking-wider text-fg-soft uppercase">
                    {dayLabel(day, today)}
                  </div>
                )}
                <Bubble mine={mine} grouped={grouped} body={m.body} time={timeIn(m.created_at, timeZone)} />
              </li>
            );
          })}
          {pending.map((p) => (
            <li key={p.tempId} className="contents">
              <Bubble mine grouped={false} body={p.body} time={p.failed ? "No enviado" : "Enviando…"} faded />
              {p.failed && (
                <button type="button" onClick={() => retry(p)} className="self-end pr-1 text-xs font-medium text-danger">
                  Reintentar
                </button>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="pb-safe border-t border-line bg-bg">
        {canSend ? (
          <form onSubmit={submit} className="flex items-end gap-2 px-3 py-2.5">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="Mensaje…"
              aria-label="Escribe un mensaje"
              className="field-sizing-content max-h-32 min-h-11 flex-1 resize-none rounded-3xl border border-line bg-surface px-4 py-2.5 text-base outline-none focus:border-fg"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Enviar"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg transition active:scale-95 disabled:opacity-40"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        ) : (
          <p className="px-5 py-4 text-center text-sm text-fg-soft">
            Esta cuenta es privada. Para escribirle, uno de los dos tiene que seguir al otro.
          </p>
        )}
      </div>
    </>
  );
}

function Bubble({
  mine,
  grouped,
  body,
  time,
  faded = false,
}: {
  mine: boolean;
  grouped: boolean;
  body: string;
  time: string;
  faded?: boolean;
}) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"} ${grouped ? "" : "mt-2"}`}>
      <div
        className={`max-w-[78%] rounded-3xl px-4 py-2 ${mine ? "bg-accent text-accent-fg" : "bg-muted text-fg"} ${faded ? "opacity-60" : ""}`}
      >
        <p className="text-[15px] leading-snug break-words whitespace-pre-wrap">{body}</p>
        <p className={`mt-0.5 text-right text-[10px] ${mine ? "opacity-60" : "text-fg-soft"}`}>{time}</p>
      </div>
    </div>
  );
}
