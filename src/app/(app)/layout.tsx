import { BottomNav } from "@/components/nav/bottom-nav";
import { requireProfile } from "@/lib/auth";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await requireProfile();

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {children}
      <BottomNav username={profile.username} />
    </div>
  );
}
