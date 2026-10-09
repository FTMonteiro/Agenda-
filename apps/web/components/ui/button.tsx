import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  className,
  variant = "primary",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "h-10 px-4 rounded-lg font-medium transition-all duration-200",
        "focus:outline-none focus:ring-4 focus:ring-blue-500/20",
        {
          "bg-black text-white hover:bg-gray-800":
            variant === "primary",

          "bg-white border border-gray-200 text-gray-900 hover:bg-gray-50":
            variant === "secondary",

          "text-gray-600 hover:bg-gray-100":
            variant === "ghost",
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}