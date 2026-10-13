"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPABASE_URL } from "@/lib/supabase/env";
import { profileSchema } from "@/lib/validation";

export type ProfileState = {
  error?: string;
  fieldErrors?: Partial<Record<"username" | "full_name" | "bio" | "avatar_url" | "timezone", string>>;
};

const AVATAR_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/avatars/`;

export async function saveProfile(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const userId = await getUserId();
  if (!userId) redirect("/login");

  const parsed = profileSchema.safeParse({
    username: formData.get("username") ?? "",
    full_name: formData.get("full_name") ?? "",
    bio: formData.get("bio") ?? "",
    avatar_url: formData.get("avatar_url") ?? "",
    timezone: formData.get("timezone") ?? "UTC",
  });

  if (!parsed.success) {
    const fieldErrors: ProfileState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ProfileState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors };
  }

  const data = parsed.data;
  // Solo aceptamos avatares subidos a tu propia carpeta del bucket
  if (data.avatar_url && !data.avatar_url.startsWith(`${AVATAR_PREFIX}${userId}/`)) {
    return { fieldErrors: { avatar_url: "Foto de perfil no válida" } };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("profiles").update(data).eq("id", userId)
    : await supabase.from("profiles").insert({ id: userId, ...data });

  if (error) {
    if (error.code === "23505") return { fieldErrors: { username: "Ese nombre de usuario ya está cogido" } };
    if (error.code === "22023") return { fieldErrors: { timezone: "Zona horaria no válida" } };
    return { error: "No se pudo guardar el perfil. Inténtalo de nuevo." };
  }

  // Borra el avatar anterior si se ha cambiado (sin bloquear si falla)
  const old = existing?.avatar_url;
  if (old && old !== data.avatar_url && old.startsWith(AVATAR_PREFIX)) {
    await supabase.storage.from("avatars").remove([old.slice(AVATAR_PREFIX.length)]);
  }

  revalidatePath("/", "layout");
  redirect(existing ? `/u/${data.username}` : "/");
}
