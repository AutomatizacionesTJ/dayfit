"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Recarga la página (datos del servidor) cuando llega un mensaje a cualquiera de mis chats. */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("messages-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => router.refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
