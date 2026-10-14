import type { Metadata } from "next";
import { WardrobeItemForm } from "@/components/wardrobe/item-form";
import { BackHeader } from "@/components/wardrobe/back-header";
import { aiConfigured } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { getAiRemaining } from "@/lib/wardrobe";

export const metadata: Metadata = { title: "Añadir prenda" };

export default async function NewWardrobeItemPage() {
  const me = await requireProfile();
  const remaining = await getAiRemaining();

  return (
    <main>
      <BackHeader href="/wardrobe" title="Añadir prenda" />
      <WardrobeItemForm userId={me.id} aiEnabled={aiConfigured()} aiRemaining={remaining} />
    </main>
  );
}
