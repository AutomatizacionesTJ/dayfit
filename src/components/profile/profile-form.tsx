"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { saveProfile, type ProfileState } from "@/app/profile-actions";
import { Avatar, Button, Field, FormMessage, Input, Textarea, inputClass } from "@/components/ui";
import { compressImage, extensionFor } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/database.types";
import { usernameSchema } from "@/lib/validation";

type Availability = "idle" | "checking" | "free" | "taken" | "invalid";

const EMPTY: string[] = [];
let tzCache: string[] | null = null;
const noopSubscribe = () => () => {};
const getDeviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || null;
const getTimezones = () => (tzCache ??= Intl.supportedValuesOf?.("timeZone") ?? EMPTY);

export function ProfileForm({
  userId,
  profile,
  submitLabel,
}: {
  userId: string;
  profile?: Profile | null;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string>();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [checked, setChecked] = useState<{ value: string; free: boolean } | null>(null);
  const [tzChoice, setTzChoice] = useState<string | null>(null);
  const deviceTz = useSyncExternalStore(noopSubscribe, getDeviceTz, () => null);
  const timezones = useSyncExternalStore(noopSubscribe, getTimezones, () => EMPTY);
  const timezone = tzChoice ?? profile?.timezone ?? deviceTz ?? "UTC";
  const fileRef = useRef<HTMLInputElement>(null);

  const normalized = username.trim().toLowerCase();
  const availability: Availability =
    !normalized || normalized === profile?.username
      ? "idle"
      : !usernameSchema.safeParse(normalized).success
        ? "invalid"
        : checked?.value === normalized
          ? checked.free
            ? "free"
            : "taken"
          : "checking";

  // Comprobación de username disponible (con espera)
  useEffect(() => {
    if (availability !== "checking") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const { data } = await createClient().rpc("username_available", { p_username: normalized });
      if (!cancelled) setChecked({ value: normalized, free: Boolean(data) });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [availability, normalized]);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadError(undefined);
    setUploading(true);
    try {
      const blob = await compressImage(file, { maxSize: 512, square: true, quality: 0.85 });
      const path = `${userId}/${Date.now()}.${extensionFor(blob)}`;
      const supabase = createClient();
      const { error } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (error) throw error;
      setAvatarUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
    } catch {
      setUploadError("No se pudo subir la foto. Prueba con otra imagen.");
    } finally {
      setUploading(false);
    }
  }

  const usernameHint = {
    idle: "Letras, números, punto y guion bajo",
    checking: "Comprobando…",
    free: "✓ Disponible",
    taken: undefined,
    invalid: undefined,
  }[availability];
  const usernameError =
    state.fieldErrors?.username ??
    (availability === "taken"
      ? "Ese nombre de usuario ya está cogido"
      : availability === "invalid"
        ? usernameSchema.safeParse(username).error?.issues[0]?.message
        : undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="avatar_url" value={avatarUrl} />

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="group relative rounded-full"
          aria-label="Cambiar foto de perfil"
        >
          <Avatar src={avatarUrl} name={fullName || username || "?"} size={104} />
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
            Cambiar
          </span>
          {uploading && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-xs text-white">
              Subiendo…
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-sm font-medium underline underline-offset-4"
        >
          {avatarUrl ? "Cambiar foto" : "Añadir foto de perfil"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        {(uploadError || state.fieldErrors?.avatar_url) && (
          <span className="text-xs text-danger">{uploadError ?? state.fieldErrors?.avatar_url}</span>
        )}
      </div>

      <Field label="Nombre" error={state.fieldErrors?.full_name}>
        <Input
          name="full_name"
          required
          maxLength={50}
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Tu nombre"
        />
      </Field>

      <Field label="Nombre de usuario" error={usernameError} hint={usernameHint}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-fg-soft">@</span>
          <input
            name="username"
            required
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className={`${inputClass} pl-8`}
            placeholder="usuario"
          />
        </div>
      </Field>

      <Field label="Bio (opcional)" error={state.fieldErrors?.bio} hint={`${bio.length}/160`}>
        <Textarea
          name="bio"
          maxLength={160}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Cuéntanos tu estilo"
        />
      </Field>

      <Field
        label="Zona horaria"
        error={state.fieldErrors?.timezone}
        hint="Define cuándo empieza tu día para el outfit diario"
      >
        <select
          name="timezone"
          value={timezone}
          onChange={(e) => setTzChoice(e.target.value)}
          className={inputClass}
        >
          {(timezones.includes(timezone) ? timezones : [timezone, ...timezones]).map((tz) => (
            <option key={tz} value={tz}>
              {tz.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Field>

      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Button
        type="submit"
        disabled={pending || uploading || availability === "taken" || availability === "checking"}
        className="mt-2 w-full"
      >
        {pending ? "Guardando…" : submitLabel}
      </Button>
    </form>
  );
}
