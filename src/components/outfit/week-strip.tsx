"use client";

import { useRef, useState } from "react";

export type StripDay = {
  date: string;
  letter: string;
  day: number;
  label: string;
  isToday: boolean;
  url: string | null;
  caption: string | null;
  posted: boolean;
};

export function WeekStrip({ days }: { days: StripDay[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<StripDay | null>(null);

  function show(day: StripDay) {
    setOpen(day);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <ol className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <li key={d.date} className="flex flex-col items-center gap-1.5">
            {d.posted && d.url ? (
              <button
                type="button"
                onClick={() => show(d)}
                className={`block aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted ${d.isToday ? "ring-2 ring-fg ring-offset-2 ring-offset-bg" : ""}`}
                aria-label={`Outfit del ${d.label}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ) : (
              <span
                className={`flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed ${d.isToday ? "border-fg" : "border-line"}`}
                aria-label={`Sin outfit el ${d.label}`}
              >
                <span className="text-[11px] text-fg-soft">{d.day}</span>
              </span>
            )}
            <span className={`text-[11px] font-medium ${d.isToday ? "text-fg" : "text-fg-soft"}`}>
              {d.isToday ? "Hoy" : d.letter}
            </span>
          </li>
        ))}
      </ol>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        className="m-auto max-h-[92dvh] w-[min(92vw,28rem)] overflow-hidden rounded-3xl bg-surface p-0 text-fg backdrop:bg-black/70 backdrop:backdrop-blur-sm"
      >
        {open?.url && (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={open.url} alt={open.caption ?? `Outfit del ${open.label}`} className="max-h-[75dvh] w-full object-cover" />
            <figcaption className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-xs font-medium tracking-wider text-fg-soft uppercase">{open.label}</p>
                {open.caption && <p className="mt-1 text-[15px]">{open.caption}</p>}
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-sm"
              >
                Cerrar
              </button>
            </figcaption>
          </figure>
        )}
      </dialog>
    </>
  );
}
