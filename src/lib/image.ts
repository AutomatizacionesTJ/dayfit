/**
 * Comprime y redimensiona una imagen en el navegador antes de subirla.
 * Respeta la orientación EXIF y exporta a WebP (con JPEG como respaldo).
 */
export type CompressOptions = {
  maxSize: number; // lado más largo en px
  quality?: number;
  square?: boolean; // recorta al centro en cuadrado (avatares)
};

export async function compressImage(
  file: File,
  { maxSize, quality = 0.82, square = false }: CompressOptions,
): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("El archivo no es una imagen");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;

  if (square) {
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2;
    sy = (sh - side) / 2;
    sw = sh = side;
  }

  const scale = Math.min(1, maxSize / Math.max(sw, sh));
  const width = Math.round(sw * scale);
  const height = Math.round(sh * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  if (!jpeg) throw new Error("No se pudo comprimir la imagen");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export function extensionFor(blob: Blob) {
  return blob.type === "image/webp" ? "webp" : "jpg";
}
