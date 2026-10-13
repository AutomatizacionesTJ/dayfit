import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Mensajes" };

export default function MessagesPage() {
  return (
    <>
      <PageHeader title="Mensajes" />
      <ComingSoon title="Chats" text="Mensajes privados en tiempo real (fase 5)." />
    </>
  );
}
