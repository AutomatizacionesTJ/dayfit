"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createOutfit } from "@/app/(app)/upload/actions";
import { Button, FormMessage, Textarea } from "@/components/ui";
import { compressImage, extensionFor } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

export function UploadForm({ userId }: { userId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [error, setError] = useState<string>();
  const [stage, setStage] = useState<"idle" | "compressing" | "uploading">("idle");
  const [pending, startTransition] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un recurso del navegador
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Elige una imagen.");
      return;
    }
    setError(undefined);
    setFile(picked);
  }

  async function onPublish() {
    if (!file) return;
    setError(undefined);
    let path: string | null = null;
    try {
      setStage("compressing");
      const blob = await compressImage(file, { maxSize: 1350, quality: 0.82 });
      setStage("uploading");
      path = `${userId}/${crypto.randomUUID()}.${extensionFor(blob)}`;
      const { error: uploadError } = await createClient()
        .storage.from("outfits")
        .upload(path, blob, { contentType: blob.type, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
    } catch {
      setStage("idle");
      setError("No se pudo subir la foto. Prueba de nuevo o con otra imagen.");
      return;
    }

    const finalPath = path;
    startTransition(async () => {
      const result = await createOutfit(finalPath, caption);
      if (result?.error) setError(result.error);
      setStage("idle");
    });
  }

  const busy = stage !== "idle" || pending;
  const label =
    stage === "compressing" ? "Preparando foto…" : stage === "uploading" || pending ? "Publicando…" : "Publicar outfit";

  return (
    <div className="flex flex-col gap-5 px-5 pb-8">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      {preview ? (
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Vista previa de tu outfit" className="aspect-[4/5] w-full object-cover" />
          {!busy && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="absolute top-3 right-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
            >
              Cambiar
            </button>
          )}
        </div>
      ) : (
        <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-6 rounded-3xl border border-dashed border-line bg-surface px-8 text-center">
          <div>
            <p className="font-display text-3xl">¿Qué llevas hoy?</p>
            <p className="mt-2 text-sm text-fg-soft">Una foto al día. Mantén tu racha 🔥</p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <Button type="button" onClick={() => cameraRef.current?.click()} className="w-full">
              <CameraIcon /> Hacer foto
            </Button>
            <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()} className="w-full">
              <GalleryIcon /> Elegir de la galería
            </Button>
          </div>
        </div>
      )}

      {preview && (
        <>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="Añade una descripción (opcional)"
            disabled={busy}
          />
          {error && <FormMessage>{error}</FormMessage>}
          <Button type="button" onClick={onPublish} disabled={busy} className="w-full">
            {label}
          </Button>
        </>
      )}
      {!preview && error && <FormMessage>{error}</FormMessage>}
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}
