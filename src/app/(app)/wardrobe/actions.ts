"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { GARMENT_CATEGORIES } from "@/lib/garments";
import { createClient } from "@/lib/supabase/server";

export type SaveResult = { error?: string };

const ItemSchema = z.object({
  id: z.uuid().optional(),
  imagePath: z.string().max(300).nullable(),
  category: z.enum(GARMENT_CATEGORIES),
  color: z.string().trim().max(40),
  brand: z.string().trim().max(60),
  notes: z.string().trim().max(300),
});

export async function saveWardrobeItem(input: z.input<typeof ItemSchema>): Promise<SaveResult> {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const parsed = ItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Revisa los datos de la prenda." };
  const { id, imagePath, category, color, brand, notes } = parsed.data;
  if (imagePath && !imagePath.startsWith(`${userId}/`)) return { error: "Foto no válida." };

  const supabase = await createClient();
  const values = { image_path: imagePath, category, color: color || null, brand: brand || null, notes: notes || null };

  if (id) {
    const { data: previous } = await supabase.from("wardrobe_items").select("image_path").eq("id", id).maybeSingle();
    if (!previous) return { error: "Esa prenda ya no existe." };
    const { error } = await supabase.from("wardrobe_items").update(values).eq("id", id);
    if (error) {
      console.error("[saveWardrobeItem]", error);
      return { error: "No se pudo guardar. Inténtalo de nuevo." };
    }
    if (previous.image_path && previous.image_path !== imagePath) {
      await supabase.storage.from("wardrobe").remove([previous.image_path]);
    }
  } else {
    const { error } = await supabase.from("wardrobe_items").insert(values);
    if (error) {
      if (imagePath) await supabase.storage.from("wardrobe").remove([imagePath]);
      console.error("[saveWardrobeItem]", error);
      return { error: "No se pudo guardar. Inténtalo de nuevo." };
    }
  }

  revalidatePath("/wardrobe");
  redirect("/wardrobe");
}

export async function deleteWardrobeItem(formData: FormData) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("wardrobe_items")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("image_path")
    .maybeSingle();
  if (data?.image_path) await supabase.storage.from("wardrobe").remove([data.image_path]);

  revalidatePath("/wardrobe");
  redirect("/wardrobe");
}
