"use client";

import { Check } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@slotix/types";

import { categoryImage } from "@/lib/category-images";

interface CategoryPickerProps {
  value: string;
  onChange: (category: string) => void;
}

/*
 * Escolha do tipo de espaço com a fotografia de cada um. Os cartões entram em cascata,
 * sobem ao passar o rato e a fotografia aproxima-se; o escolhido fica com o visto.
 */
export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  return (
    <div role="radiogroup" aria-label="Tipo de espaço" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {BUSINESS_CATEGORIES.map((category, index) => {
        const selected = value === category;

        return (
          <button
            key={category}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(category)}
            style={{ animationDelay: `${index * 45}ms` }}
            className={`fade-up group relative overflow-hidden rounded-2xl border text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-[0.98] ${
              selected ? "border-primary ring-2 ring-primary/25" : "border-[var(--border)]"
            }`}
          >
            <img
              src={categoryImage(category)}
              alt=""
              loading="lazy"
              className="h-24 w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            <span className="block bg-[var(--background)] px-3 py-2.5 text-xs font-semibold">{category}</span>

            {selected ? (
              <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow">
                <Check size={14} />
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
