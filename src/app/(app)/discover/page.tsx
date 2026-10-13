import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Descubrir" };

export default function DiscoverPage() {
  return (
    <>
      <PageHeader title="Descubrir" />
      <ComingSoon title="Estilos nuevos" text="Outfits de cuentas públicas y buscador de usuarios (fase 4)." />
    </>
  );
}
