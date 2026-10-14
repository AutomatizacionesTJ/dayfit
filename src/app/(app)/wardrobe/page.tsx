import type { Metadata } from "next";
import Link from "next/link";
import { BackHeader } from "@/components/wardrobe/back-header";
import { ButtonLink } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { getWardrobe } from "@/lib/wardrobe";

export const metadata: Metadata = { title: "Mi armario" };

export default async function WardrobePage() {
  const me = await requireProfile();
  const items = await getWardrobe();

  return (
    <main>
      <BackHeader
        href={`/u/${me.username}`}
        title="Mi armario"
        action={
          <ButtonLink href="/wardrobe/new" className="h-9 px-4">
            Añadir
          </ButtonLink>
        }
      />

      {items.length === 0 ? (
        <div className="flex flex-col items-center px-8 py-20 text-center">
          <p className="font-display text-3xl">Tu armario está vacío</p>
          <p className="mt-2 max-w-xs text-sm text-fg-soft">
            Guarda tus prendas con una foto. La IA puede rellenar el tipo, el color y la marca por ti.
          </p>
          <ButtonLink href="/wardrobe/new" className="mt-6">
            Añadir mi primera prenda
          </ButtonLink>
        </div>
      ) : (
        <>
          <p className="px-5 pb-3 text-sm text-fg-soft">
            {items.length} {items.length === 1 ? "prenda" : "prendas"}
          </p>
          <ul className="grid grid-cols-3 gap-2 px-3 pb-10">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/wardrobe/${item.id}`} className="block">
                  <span className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-muted">
                    {item.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-2xl text-fg-soft">{item.category.charAt(0)}</span>
                    )}
                  </span>
                  <span className="mt-1.5 block truncate text-xs font-medium">{item.category}</span>
                  <span className="block truncate text-[11px] text-fg-soft">
                    {[item.color, item.brand].filter(Boolean).join(" · ") || " "}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
