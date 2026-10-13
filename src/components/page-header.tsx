import type { ReactNode } from "react";

export function PageHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <header className="pt-safe sticky top-0 z-30 bg-bg/85 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-5">
        <h1 className="font-display text-3xl italic tracking-tight">{title}</h1>
        {action}
      </div>
    </header>
  );
}

export function ComingSoon({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-8 py-24 text-center">
      <p className="font-display text-3xl">{title}</p>
      <p className="mt-2 max-w-xs text-sm text-fg-soft">{text}</p>
    </div>
  );
}
