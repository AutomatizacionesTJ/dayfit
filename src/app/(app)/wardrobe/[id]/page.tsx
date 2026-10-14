import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WardrobeItemForm } from "@/components/wardrobe/item-form";
import { BackHeader } from "@/components/wardrobe/back-header";
import { aiConfigured } from "@/lib/ai";
import { requireProfile } from "@/lib/auth";
import { getAiRemaining, getWardrobeItem } from "@/lib/wardrobe";
import { deleteWardrobeItem } from "../actions";

export const metadata: Metadata = { title: "Prenda" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function WardrobeItemPage({ params }: PageProps<"/wardrobe/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await requireProfile();
  const [item, remaining] = await Promise.all([getWardrobeItem(id), getAiRemaining()]);
  if (!item) notFound();

  return (
    <main>
      <BackHeader href="/wardrobe" title="Editar prenda" />
      <WardrobeItemForm userId={me.id} aiEnabled={aiConfigured()} aiRemaining={remaining} item={item} />
      <form action={deleteWardrobeItem} className="px-5 pb-10">
        <input type="hidden" name="id" value={item.id} />
        <button type="submit" className="w-full rounded-full py-3 text-sm font-medium text-danger hover:bg-muted">
          Borrar prenda
        </button>
      </form>
    </main>
  );
}
