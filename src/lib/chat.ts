import "server-only";
import { createClient } from "@/lib/supabase/server";

export const MESSAGES_PAGE = 50;

export async function canMessage(otherId: string) {
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_message", { p_other: otherId });
  return data === true;
}

export async function getMyConversations() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) console.error("[getMyConversations]", error);
  return data ?? [];
}

/** Conversación (si soy miembro, por RLS), la otra persona y los últimos mensajes. */
export async function getConversation(id: string, meId: string) {
  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (!conversation) return null;

  const otherId = conversation.user_a === meId ? conversation.user_b : conversation.user_a;
  const [{ data: other }, { data: messages }, allowed] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", otherId).single(),
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(MESSAGES_PAGE),
    canMessage(otherId),
  ]);
  if (!other) return null;

  return {
    id,
    other,
    messages: (messages ?? []).reverse(),
    hasMore: (messages ?? []).length === MESSAGES_PAGE,
    canSend: allowed,
  };
}
