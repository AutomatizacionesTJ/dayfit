import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

const buttonBase =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";
const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-accent-fg hover:opacity-90",
  secondary: "border border-line bg-surface text-fg hover:bg-muted",
  ghost: "text-fg hover:bg-muted",
};

export function buttonClass(variant: ButtonVariant = "primary", extra = "") {
  return `${buttonBase} ${buttonVariants[variant]} ${extra}`;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={buttonClass(variant, className)} {...props} />;
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-fg-soft">{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="text-xs text-fg-soft">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-fg outline-none transition placeholder:text-fg-soft/70 focus:border-fg";

export function Input(props: ComponentProps<"input">) {
  return <input className={inputClass} {...props} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} h-auto min-h-24 resize-none py-3`} {...props} />;
}

export function Logo({ className = "" }: { className?: string }) {
  return <span className={`font-display text-3xl italic tracking-tight ${className}`}>dayfit</span>;
}

export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-fg-soft ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-display">{initial}</span>
      )}
    </span>
  );
}

export function FormMessage({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "info" }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${tone === "error" ? "bg-danger/10 text-danger" : "bg-muted text-fg"}`}
    >
      {children}
    </p>
  );
}
