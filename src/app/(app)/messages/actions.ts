"use server";

import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Abre (o crea) la conversación con otra persona y lleva al chat. */
export async function startConversation(formData: FormData) {
  if (!(await getUserId())) redirect("/login");
  const otherId = String(formData.get("other") ?? "");
  const back = String(formData.get("back") ?? "/messages");
  if (!UUID.test(otherId)) redirect("/messages");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_or_create_conversation", { p_other: otherId });
  if (error || !data) {
    console.error("[startConversation]", error);
    redirect(back.startsWith("/u/") ? `${back}?chat=no` : "/messages");
  }
  redirect(`/messages/${data}`);
}
