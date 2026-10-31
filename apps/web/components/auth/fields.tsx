"use client";

import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

/*
 * Peças dos formulários de entrada e cadastro. Seguem as medidas do painel (h-11,
 * rounded-xl, text-sm) e os tokens do tema, para as duas telas não parecerem de outro produto.
 */

const inputClass =
  "h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 text-base text-[var(--foreground)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--subtle)] hover:border-[var(--muted)] focus:border-primary focus:ring-[3px] focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
  action?: ReactNode;
};

export function TextField({ id, label, hint, action, className = "", ...props }: FieldProps) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        {action}
      </div>
      <input id={id} aria-describedby={hint ? `${id}-hint` : undefined} className={`${inputClass} ${className}`} {...props} />
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-[var(--muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <TextField {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        disabled={props.disabled}
        aria-label={visible ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
        aria-pressed={visible}
        className="absolute right-1.5 top-8 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--subtle)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-primary"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary";
};

export function AuthButton({ loading = false, variant = "primary", className = "", children, disabled, ...props }: ButtonProps) {
  const look =
    variant === "primary"
      ? "bg-primary text-white hover:bg-primary-hover"
      : "border border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-secondary)]";

  return (
    <button
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 ${look} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export function GoogleButton({ loading, children, ...props }: ButtonProps) {
  return (
    <AuthButton type="button" variant="secondary" loading={loading} className="w-full font-medium" {...props}>
      {!loading && <GoogleIcon />}
      {children}
    </AuthButton>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-[13px] text-[var(--subtle)]">
      <span className="h-px flex-1 bg-[var(--border)]" />
      ou
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

export function FormAlert({ tone = "error", children }: { tone?: "error" | "success"; children: ReactNode }) {
  const error = tone === "error";
  const Icon = error ? AlertCircle : CheckCircle2;

  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-snug ${
        error
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      }`}
    >
      <Icon size={17} className="mt-px shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.2Z"
      />
      <path
        fill="#34A853"
        d="M12 21.82c2.63 0 4.84-.87 6.45-2.39l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.82Z"
      />
      <path
        fill="#FBBC05"
        d="M6.54 13.87A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.87V7.6H3.3A9.83 9.83 0 0 0 2.25 12c0 1.58.38 3.08 1.05 4.4l3.24-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.1c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.16 14.63 2.18 12 2.18A9.75 9.75 0 0 0 3.3 7.6l3.24 2.53C7.31 7.82 9.46 6.1 12 6.1Z"
      />
    </svg>
  );
}
