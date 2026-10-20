"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Link2,
  Loader2,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { BrandIcon } from "@/components/brand/BrandLogo";
import { formatCurrency, formatDate, formatDateTime, methodMeta } from "./finance-utils";

export type ReceiptData = {
  number?: string;
  business?: {
    name: string;
    logoUrl: string | null;
    address: string | null;
    phone: string | null;
  } | null;
  payment: { id: string; amount: number; method: string; status: string; paidAt: string };
  appointment: { id: string; date: string; status: string; notes: string | null };
  client: { name: string; email: string | null; phone: string | null };
  professional: { name: string; specialty: string | null };
  service: { name: string; price: number; duration: number };
  total: number;
};

// O que a lista já sabe do pagamento: mostra-se logo, enquanto o recibo completo carrega.
export type ReceiptPreview = {
  clientName: string;
  serviceName: string;
  amount: number;
};

const APPOINTMENT_STATUS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmado",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
  NO_SHOW: "Falta",
};

type Props = {
  appointmentId: string | null;
  preview?: ReceiptPreview | null;
  onClose: () => void;
};

export function ReceiptDrawer({ appointmentId, preview, onClose }: Props) {
  // Resultado do último pedido, guardado com a chave que o pediu: enquanto a chave atual
  // não tiver resultado, o recibo está a carregar.
  const [result, setResult] = useState<{ key: string; receipt?: ReceiptData; error?: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);

  const requestKey = appointmentId ? `${appointmentId}#${attempt}` : null;
  const current = result && result.key === requestKey ? result : null;
  const loading = Boolean(requestKey) && !current;
  const receipt = current?.receipt ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    if (!appointmentId || !requestKey) return;
    const controller = new AbortController();

    fetch(`/api/appointments/payments/${encodeURIComponent(appointmentId)}/receipt`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.receipt) {
          throw new Error(data?.error || "Não foi possível carregar o recibo.");
        }
        setResult({ key: requestKey, receipt: data.receipt });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setResult({
          key: requestKey,
          error: err instanceof Error ? err.message : "Não foi possível carregar o recibo.",
        });
      });

    return () => controller.abort();
  }, [appointmentId, requestKey]);

  // Esc fecha; o fundo deixa de deslizar enquanto o recibo está aberto.
  useEffect(() => {
    if (!appointmentId) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [appointmentId, onClose]);

  if (!appointmentId) return null;

  const copy = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(message);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const shareLink = () => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("receipt", appointmentId);
    copy(url.toString(), "Link do recibo copiado.");
  };

  const method = receipt ? methodMeta(receipt.payment.method) : null;
  const MethodIcon = method?.icon;
  const businessName = receipt?.business?.name ?? "Agenda+";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Recibo do pagamento">
      <div className="finance-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px] print:hidden" onClick={onClose} />

      <aside className="finance-slide-in relative flex h-full w-full max-w-[480px] flex-col bg-[var(--background)] shadow-2xl print:max-w-none print:shadow-none">
        {/* BARRA DE AÇÕES */}
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 print:hidden">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Recibo</h2>
            <p className="truncate text-xs text-[var(--muted)]">
              {receipt?.number ?? (preview ? `${preview.clientName} · ${preview.serviceName}` : "A carregar...")}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--muted)] transition hover:bg-[var(--surface-secondary)] hover:text-[var(--foreground)]"
          >
            <X size={18} />
          </button>
        </header>

        {/* CONTEÚDO */}
        <div className="finance-scroll flex-1 overflow-y-auto p-5 print:overflow-visible print:p-0">
          {loading && (
            <div className="space-y-4">
              {preview && (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Total pago</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-[var(--foreground)]">
                    {formatCurrency(preview.amount, true)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{preview.clientName}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-[var(--muted)]">
                <Loader2 size={16} className="animate-spin" />
                A gerar o recibo...
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
                <AlertCircle size={22} />
              </div>
              <p className="mt-4 text-sm font-semibold text-[var(--foreground)]">Recibo indisponível</p>
              <p className="mt-1 max-w-xs text-sm text-[var(--muted)]">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
                className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
              >
                <RefreshCw size={14} />
                Tentar novamente
              </button>
            </div>
          )}

          {!loading && receipt && method && MethodIcon && (
            <article
              id="finance-receipt"
              className="finance-fade-up overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm print:rounded-none print:border-0 print:shadow-none"
            >
              {/* EMISSOR */}
              <div className="flex items-start justify-between gap-4 px-6 pb-5 pt-6">
                <div className="flex min-w-0 items-center gap-3">
                  {receipt.business?.logoUrl ? (
                    // Logótipo do estabelecimento (URL externo ou data URL), por isso <img>.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={receipt.business.logoUrl}
                      alt=""
                      className="h-11 w-11 shrink-0 rounded-xl border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <BrandIcon size={44} />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--foreground)]">{businessName}</p>
                    {receipt.business?.address && (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--muted)]">
                        <MapPin size={11} className="shrink-0" />
                        {receipt.business.address}
                      </p>
                    )}
                    {receipt.business?.phone && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--muted)]">
                        <Phone size={11} className="shrink-0" />
                        {receipt.business.phone}
                      </p>
                    )}
                  </div>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 print:border print:border-emerald-600">
                  <CheckCircle2 size={13} />
                  Pago
                </span>
              </div>

              {/* VALOR */}
              <div className="mx-6 rounded-2xl bg-gradient-to-br from-[#009685] to-[#00695e] px-6 py-6 text-center text-white print:bg-none print:text-black">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/75 print:text-black/60">
                  Total pago
                </p>
                <p className="mt-2 text-[34px] font-bold leading-none tracking-tight tabular-nums">
                  {formatCurrency(receipt.total, true)}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/85 print:text-black/70">
                  <MethodIcon size={13} />
                  {method.label} · {formatDateTime(receipt.payment.paidAt)}
                </p>
              </div>

              {/* DADOS */}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 py-6 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Recibo nº</dt>
                  <dd className="mt-0.5 font-mono text-[13px] font-semibold text-[var(--foreground)]">{receipt.number ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Data de emissão</dt>
                  <dd className="mt-0.5 font-medium text-[var(--foreground)]">{formatDate(receipt.payment.paidAt)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[var(--muted)]">Cliente</dt>
                  <dd className="mt-0.5 truncate font-medium text-[var(--foreground)]">{receipt.client.name}</dd>
                  {receipt.client.phone && <dd className="truncate text-xs text-[var(--muted)]">{receipt.client.phone}</dd>}
                  {receipt.client.email && <dd className="truncate text-xs text-[var(--muted)]">{receipt.client.email}</dd>}
                </div>
                <div className="min-w-0">
                  <dt className="text-xs text-[var(--muted)]">Atendido por</dt>
                  <dd className="mt-0.5 truncate font-medium text-[var(--foreground)]">{receipt.professional.name}</dd>
                  {receipt.professional.specialty && (
                    <dd className="truncate text-xs text-[var(--muted)]">{receipt.professional.specialty}</dd>
                  )}
                </div>
              </dl>

              {/* PICOTADO */}
              <div className="relative px-6" aria-hidden>
                <div className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] print:hidden" />
                <div className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--border)] bg-[var(--background)] print:hidden" />
                <div className="border-t-2 border-dashed border-[var(--border)]" />
              </div>

              {/* LINHAS */}
              <div className="px-6 py-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Descrição</p>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--foreground)]">{receipt.service.name}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={12} />
                        {formatDateTime(receipt.appointment.date)}
                      </span>
                      {receipt.service.duration > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} />
                          {receipt.service.duration} min
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums text-[var(--foreground)]">
                    {formatCurrency(receipt.service.price, true)}
                  </p>
                </div>

                {receipt.appointment.notes && (
                  <p className="mt-3 rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                    {receipt.appointment.notes}
                  </p>
                )}

                <div className="mt-5 space-y-2 border-t border-[var(--border)] pt-4 text-sm">
                  <div className="flex justify-between text-[var(--muted)]">
                    <span>Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(receipt.service.price, true)}</span>
                  </div>
                  {receipt.service.price !== receipt.total && (
                    <div className="flex justify-between text-[var(--muted)]">
                      <span>Ajuste</span>
                      <span className="tabular-nums">{formatCurrency(receipt.total - receipt.service.price, true)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="font-semibold text-[var(--foreground)]">Total</span>
                    <span className="text-lg font-bold tabular-nums text-[var(--foreground)]">
                      {formatCurrency(receipt.total, true)}
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-xs text-[var(--muted)]">
                  Estado do agendamento:{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    {APPOINTMENT_STATUS[receipt.appointment.status] ?? receipt.appointment.status}
                  </span>
                </p>
              </div>

              {/* RODAPÉ */}
              <div className="border-t border-[var(--border)] bg-[var(--surface-secondary)] px-6 py-5 text-center">
                <p className="text-sm font-semibold text-[var(--foreground)]">Obrigado pela preferência.</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Este documento comprova o pagamento registado.</p>
                <p className="mt-3 text-[10px] font-medium uppercase tracking-widest text-[var(--muted)]">
                  Emitido por Agenda+ · {receipt.payment.id.slice(-12)}
                </p>
              </div>
            </article>
          )}
        </div>

        {/* AÇÕES */}
        {receipt && !loading && (
          <footer className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-4 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
            >
              <Printer size={16} />
              Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => copy(receipt.number ?? receipt.payment.id, "Número do recibo copiado.")}
              aria-label="Copiar número do recibo"
              title="Copiar número"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
            >
              <Copy size={16} />
            </button>
            <button
              type="button"
              onClick={shareLink}
              aria-label="Copiar link do recibo"
              title="Copiar link"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
            >
              <Link2 size={16} />
            </button>
          </footer>
        )}
      </aside>

      {/* Na impressão só o recibo aparece, em branco e sem sombras. */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #finance-receipt, #finance-receipt * { visibility: visible !important; }
          #finance-receipt {
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            max-width: 560px !important;
            background: #fff !important;
            color: #111 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          @page { margin: 14mm; }
        }
      `}</style>
    </div>
  );
}
