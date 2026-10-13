"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type CreateOutfitResult = { error?: string };

export async function createOutfit(imagePath: string, caption: string): Promise<CreateOutfitResult> {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const cleanCaption = caption.trim().slice(0, 300) || null;

  if (!imagePath.startsWith(`${userId}/`) || imagePath.length > 300) {
    return { error: "Foto no válida. Vuelve a intentarlo." };
  }

  const { error } = await supabase.from("outfits").insert({ image_path: imagePath, caption: cleanCaption });

  if (error) {
    // La foto ya se subió: la borramos para no dejar archivos huérfanos
    await supabase.storage.from("outfits").remove([imagePath]);
    if (error.code === "23505") return { error: "Ya has subido tu outfit de hoy." };
    console.error("[createOutfit]", error);
    return { error: "No se pudo publicar tu outfit. Inténtalo de nuevo." };
  }

  revalidatePath("/", "layout");
  redirect("/upload?nuevo=1");
}

export async function deleteOutfit(formData: FormData) {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data } = await supabase
    .from("outfits")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("image_path")
    .maybeSingle();

  if (data?.image_path) await supabase.storage.from("outfits").remove([data.image_path]);

  revalidatePath("/", "layout");
  redirect("/upload");
}
