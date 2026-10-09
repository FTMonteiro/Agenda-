import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-text">{label}</label>
      )}

      <input
        {...props}
        className="
          w-full
          rounded-lg
          border
          border-gray-300
          px-4
          py-2
          outline-none
          focus:border-primary
          focus:ring-2
          focus:ring-primary/20
          transition
        "
      />

      {error && <span className="text-sm text-error">{error}</span>}
    </div>
  );
}
