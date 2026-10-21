"use client";

import { useEffect, useState } from "react";
import { Heart, Star, StarHalf } from "lucide-react";

/*
 * A avaliação do espaço na app: a média das estrelas (1 a 5) que os clientes deram depois
 * de serem atendidos, quantas avaliações há de cada nota e os comentários mais recentes.
 * Os favoritos (gostos) aparecem à parte — não contam para a nota.
 */

type RatingData = {
  average: number | null;
  count: number;
  favorites: number;
  distribution: { stars: number; count: number }[];
  recent: { id: string; clientName: string; rating: number; comment: string | null; createdAt: string }[];
};

const STAR = "text-amber-500 dark:text-amber-400";

export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((position) => {
        const fill = value - (position - 1);
        if (fill >= 0.75) return <Star key={position} size={size} className={`${STAR} fill-current`} />;
        if (fill >= 0.25)
          return (
            <span key={position} className="relative inline-flex">
              <Star size={size} className="text-[var(--border-strong)]" />
              <StarHalf size={size} className={`absolute inset-0 ${STAR} fill-current`} />
            </span>
          );
        return <Star key={position} size={size} className="text-[var(--border-strong)]" />;
      })}
    </span>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", { day: "2-digit", month: "short" }).format(new Date(value));

export function RatingCard() {
  const [data, setData] = useState<RatingData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/avaliacoes", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        if (cancelled) return;
        if (json?.success) setData(json);
        else setFailed(true);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const total = data?.count ?? 0;

  return (
    <section
      style={{ animationDelay: "480ms" }}
      className="finance-fade-up rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--foreground)]">Avaliação do espaço</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Estrelas dadas pelos clientes na app</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Star size={20} />
        </div>
      </div>

      {!data && !failed ? (
        <div className="mt-5 space-y-3">
          <div className="h-10 w-28 animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
          <div className="h-16 animate-pulse rounded-lg bg-[var(--surface-secondary)]" />
        </div>
      ) : failed || !data ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Não foi possível carregar as avaliações.</p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-4xl font-bold leading-none tracking-tight tabular-nums text-[var(--foreground)]">
              {data.average !== null && total > 0 ? data.average.toFixed(1) : "—"}
            </span>
            <div className="pb-0.5">
              <StarRow value={data.average ?? 0} />
              <p className="mt-1 text-xs text-[var(--muted)]">
                {total === 0 ? "Ainda sem avaliações" : `${total} ${total === 1 ? "avaliação" : "avaliações"}`}
              </p>
            </div>
          </div>

          {/* Quantas avaliações de cada nota, de 5 a 1 estrela */}
          <ul className="mt-5 space-y-1.5">
            {data.distribution.map(({ stars, count }) => (
              <li key={stars} className="flex items-center gap-2 text-xs">
                <span className="flex w-7 shrink-0 items-center gap-0.5 font-medium tabular-nums text-[var(--muted)]">
                  {stars}
                  <Star size={11} className={`${STAR} fill-current`} />
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
                  <span
                    className="block h-full rounded-full bg-amber-500 transition-[width] duration-700 ease-out dark:bg-amber-400"
                    style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right font-semibold tabular-nums text-[var(--foreground)]">{count}</span>
              </li>
            ))}
          </ul>

          <p className="mt-4 flex items-center gap-1.5 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
            <Heart size={13} className="text-rose-500" />
            {data.favorites === 1 ? "1 cliente tem o espaço nos favoritos" : `${data.favorites} clientes têm o espaço nos favoritos`}
          </p>

          {data.recent.length > 0 && (
            <ul className="mt-4 space-y-3">
              {data.recent.map((review) => (
                <li key={review.id} className="rounded-xl bg-[var(--surface-secondary)]/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-[var(--foreground)]">{review.clientName}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <StarRow value={review.rating} size={12} />
                      <span className="text-[11px] text-[var(--muted)]">{formatDate(review.createdAt)}</span>
                    </span>
                  </div>
                  {review.comment && <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">{review.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
