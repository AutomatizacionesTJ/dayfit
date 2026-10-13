import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <Logo className="text-5xl" />
        <p className="mt-2 text-sm text-fg-soft">Un outfit al día.</p>
      </div>
      {children}
    </main>
  );
}
