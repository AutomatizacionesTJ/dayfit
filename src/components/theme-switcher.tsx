"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const OPTIONS = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

const subscribe = () => () => {};

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
      {OPTIONS.map((o) => {
        const active = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={`h-9 rounded-full text-sm font-medium transition ${active ? "bg-surface text-fg shadow-sm" : "text-fg-soft"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
