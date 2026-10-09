import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
}

export function Card({ children, title }: CardProps) {
  return (
    <div
      className="
        rounded-xl
        bg-white
        p-6
        shadow-sm
        border
        border-gray-200
      "
    >

      {title && (
        <h2 className="mb-4 text-lg font-semibold">
          {title}
        </h2>
      )}

      {children}

    </div>
  );
}