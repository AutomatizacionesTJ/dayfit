import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Subir outfit" };

export default function UploadPage() {
  return (
    <>
      <PageHeader title="Hoy" />
      <ComingSoon title="Tu outfit del día" text="Podrás subir tu foto desde la cámara o la galería (fase 2)." />
    </>
  );
}
