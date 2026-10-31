import Link from "next/link";
import type { ReactNode } from "react";
import { BUSINESS_CATEGORIES } from "@slotix/types";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { categoryImage } from "@/lib/category-images";

/*
 * Moldura comum do login e do cadastro: o formulário à esquerda e, em ecrãs largos, um
 * painel à direita com os tipos de espaço que o agenda+ serve (as mesmas fotografias da
 * app). Usa os tokens do tema, por isso segue o modo claro/escuro como o resto do painel.
 */
export function AuthShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="grid min-h-screen bg-[var(--surface)] text-[var(--foreground)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-10 sm:py-8">
        <Link href="/" className="w-fit rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          <BrandLogo size={32} />
        </Link>

        <div className="flex flex-1 items-center justify-center py-12">
          <div className={`w-full ${wide ? "max-w-[560px]" : "max-w-[380px]"}`}>{children}</div>
        </div>

        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--subtle)]">
          <span>© {new Date().getFullYear()} Nevrix</span>
          <Link href="/termos" className="hover:text-[var(--foreground)]">
            Termos de utilização
          </Link>
          <Link href="/termos/privacidade" className="hover:text-[var(--foreground)]">
            Política de privacidade
          </Link>
        </footer>
      </div>

      <aside className="hidden border-l border-[var(--border)] bg-[var(--surface-secondary)] lg:flex lg:items-center lg:justify-center">
        <div className="w-full max-w-[520px] px-12 py-16">
          <h2 className="text-2xl font-semibold leading-snug tracking-[-0.02em] text-[var(--foreground)]">
            A agenda, os clientes e os pagamentos do seu espaço, no mesmo sítio.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            Para barbearias, salões, estúdios de nails, spas e outros espaços que trabalham por marcação.
          </p>

          <ul className="mt-10 grid grid-cols-4 gap-3" aria-label="Tipos de espaço">
            {BUSINESS_CATEGORIES.map((category) => (
              <li key={category}>
                <img
                  src={categoryImage(category)}
                  alt=""
                  className="aspect-square w-full rounded-xl object-cover"
                  loading="lazy"
                />
                <span className="mt-1.5 block truncate text-xs text-[var(--muted)]">{category}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}

export function AuthHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow && <p className="mb-2 text-sm text-[var(--muted)]">{eyebrow}</p>}
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
      {description && <p className="mt-2 text-[15px] leading-relaxed text-[var(--muted)]">{description}</p>}
    </header>
  );
}
