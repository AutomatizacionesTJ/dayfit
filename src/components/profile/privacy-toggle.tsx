"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setPrivacy } from "@/app/(app)/follow-actions";

export function PrivacyToggle({ isPrivate }: { isPrivate: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(isPrivate);
  const [error, setError] = useState<string>();

  function toggle() {
    const next = !optimistic;
    if (
      !next &&
      !window.confirm("Tu cuenta pasará a ser pública: cualquiera podrá ver tus outfits y se aceptarán las solicitudes pendientes.")
    ) {
      return;
    }
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setPrivacy(next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        disabled={pending}
        onClick={toggle}
        className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-surface px-4 py-3.5 text-left disabled:opacity-70"
      >
        <span>
          <span className="block text-[15px] font-medium">Cuenta privada</span>
          <span className="mt-0.5 block text-xs text-fg-soft">
            {optimistic
              ? "Solo tus seguidores aprobados ven tus outfits."
              : "Cualquiera puede seguirte y ver tus outfits."}
          </span>
        </span>
        <span
          aria-hidden
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${optimistic ? "bg-accent" : "bg-line"}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full shadow transition ${optimistic ? "translate-x-5 bg-accent-fg" : "bg-fg-soft"}`}
          />
        </span>
      </button>
      {error && <p role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  );
}
