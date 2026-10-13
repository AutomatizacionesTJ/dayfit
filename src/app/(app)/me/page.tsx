import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";

export default async function MePage() {
  const profile = await requireProfile();
  redirect(`/u/${profile.username}`);
}
