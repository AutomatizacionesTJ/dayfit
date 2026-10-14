"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveWardrobeItem } from "@/app/(app)/wardrobe/actions";
import { Button, Field, FormMessage, Input, Textarea, inputClass } from "@/components/ui";
import { GARMENT_CATEGORIES, type AnalyzeResponse, type GarmentCategory } from "@/lib/garments";
import { compressImage, extensionFor } from "@/lib/image";
import type { WardrobeItem } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/client";

/** Por debajo de esta confianza pedimos al usuario que revise el dato. */
const LOW_CONFIDENCE = 0.6;

type Confidence = { category: number; color: number; brand: number };

export function WardrobeItemForm({
  userId,
  aiEnabled,
  aiRemaining,
  item,
}: {
  userId: string;
  aiEnabled: boolean;
  aiRemaining: number;
  item?: WardrobeItem & { url: string | null };
}) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removedPhoto, setRemovedPhoto] = useState(false);
  const [category, setCategory] = useState<GarmentCategory | "">((item?.category as GarmentCategory) ?? "");
  const [color, setColor] = useState(item?.color ?? "");
  const [brand, setBrand] = useState(item?.brand ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [remaining, setRemaining] = useState(aiRemaining);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiMessage, setAiMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con un recurso del navegador
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    if (!picked.type.startsWith("image/")) {
      setError("Elige una imagen.");
      return;
    }
    setError(undefined);
    setAiMessage(undefined);
    setConfidence(null);
    try {
      setPhoto(await compressImage(picked, { maxSize: 1024, quality: 0.85 }));
      setRemovedPhoto(false);
    } catch {
      setError("No se pudo leer la imagen. Prueba con otra.");
    }
  }

  function clearPhoto() {
    setPhoto(null);
    setPreview(null);
    setRemovedPhoto(true);
    setConfidence(null);
    setAiMessage(undefined);
  }

  async function analyze() {
    if (!photo) return;
    setAnalyzing(true);
    setAiMessage(undefined);
    try {
      const body = new FormData();
      body.append("image", photo, `prenda.${extensionFor(photo)}`);
      const res = await fetch("/api/wardrobe/analyze", { method: "POST", body });
      const data = (await res.json()) as AnalyzeResponse;
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (!data.ok) {
        setAiMessage(data.error);
      } else if (!data.garment) {
        setAiMessage("No hemos reconocido ninguna prenda en la foto. Rellena los datos a mano.");
      } else {
        setCategory(data.garment.category);
        setColor(data.garment.color);
        setBrand(data.garment.brand ?? "");
        setConfidence(data.garment.confidence);
      }
    } catch {
      setAiMessage("La IA no ha respondido. Rellena los datos a mano.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      setError("Elige el tipo de prenda.");
      return;
    }
    setError(undefined);

    let imagePath: string | null = removedPhoto ? null : (item?.image_path ?? null);
    if (photo) {
      setUploading(true);
      const path = `${userId}/${crypto.randomUUID()}.${extensionFor(photo)}`;
      const { error: uploadError } = await createClient()
        .storage.from("wardrobe")
        .upload(path, photo, { contentType: photo.type, cacheControl: "3600" });
      setUploading(false);
      if (uploadError) {
        setError("No se pudo subir la foto. Prueba de nuevo.");
        return;
      }
      imagePath = path;
    }

    startTransition(async () => {
      const result = await saveWardrobeItem({ id: item?.id, imagePath, category, color, brand, notes });
      if (result?.error) setError(result.error);
    });
  }

  const shownImage = preview ?? (removedPhoto ? null : (item?.url ?? null));
  const busy = uploading || pending;
  const canAnalyze = aiEnabled && photo !== null && !analyzing && !busy;

  return (
    <form onSubmit={onSave} className="flex flex-col gap-5 px-5 pt-2 pb-6">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onPick} />

      {shownImage ? (
        <div className="relative mx-auto w-full max-w-xs overflow-hidden rounded-3xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shownImage} alt="Foto de la prenda" className="aspect-square w-full object-cover" />
          {!busy && (
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={clearPhoto}
                className="rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white backdrop-blur"
              >
                Quitar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mx-auto flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-line bg-surface px-6 text-center">
          <p className="text-sm text-fg-soft">Añade una foto de la prenda (opcional)</p>
          <div className="flex w-full flex-col gap-2">
            <Button type="button" onClick={() => cameraRef.current?.click()} className="w-full">
              Hacer foto
            </Button>
            <Button type="button" variant="secondary" onClick={() => galleryRef.current?.click()} className="w-full">
              Elegir de la galería
            </Button>
          </div>
        </div>
      )}

      {aiEnabled && photo && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={analyze}
            disabled={!canAnalyze || remaining <= 0}
            className="w-full"
          >
            <SparkIcon />
            {analyzing
              ? "Analizando…"
              : remaining > 0
                ? `Analizar con IA (${remaining === 1 ? "queda 1" : `quedan ${remaining}`} hoy)`
                : "Sin análisis hasta mañana"}
          </Button>
          {aiMessage && <FormMessage tone="info">{aiMessage}</FormMessage>}
        </div>
      )}

      <Field label="Tipo" hint={hintFor(confidence?.category)}>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as GarmentCategory)}
          className={inputClass}
          required
        >
          <option value="" disabled>
            Elige un tipo
          </option>
          {GARMENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Color" hint={hintFor(confidence?.color)}>
        <Input value={color} onChange={(e) => setColor(e.target.value)} maxLength={40} placeholder="Ej.: azul marino" />
      </Field>

      <Field label="Marca" hint={hintFor(confidence?.brand, brand)}>
        <Input value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={60} placeholder="Ej.: Zara" />
      </Field>

      <Field label="Notas">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="Talla, dónde la compraste… (opcional)"
        />
      </Field>

      {error && <FormMessage>{error}</FormMessage>}

      <Button type="submit" disabled={busy || analyzing} className="w-full">
        {busy ? "Guardando…" : item ? "Guardar cambios" : "Añadir al armario"}
      </Button>
    </form>
  );
}

function hintFor(value: number | undefined, text?: string) {
  if (value === undefined) return undefined;
  if (text !== undefined && !text) return "La IA no ha visto la marca.";
  const percent = Math.round(value * 100);
  return value < LOW_CONFIDENCE ? `Revísalo: la IA no está segura (${percent} %).` : `Detectado por la IA (${percent} %).`;
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />
    </svg>
  );
}
