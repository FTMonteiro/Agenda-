"use client";

import { ImagePlus } from "lucide-react";
import { categoryExamples } from "@/lib/category-examples";
import { CategoryPicker } from "./CategoryPicker";

import { LocationMap } from "./LocationMap";

interface Business {
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  provincia: string;
  municipio: string;
  distrito: string;
  bairro: string;
  rua: string;
  latitude: number | null;
  longitude: number | null;
  logo: string;
}

interface BusinessSettingsProps {
  business: Business;

  setBusiness: React.Dispatch<React.SetStateAction<Business>>;
}

export function BusinessSettings({ business, setBusiness }: BusinessSettingsProps) {
  const updateField = (field: Exclude<keyof Business, "latitude" | "longitude">, value: string) => {
    setBusiness((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      updateField("logo", reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {/* HEADER */}
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-lg font-semibold">Informações gerais</h2>

          <p className="mt-1 text-sm text-[var(--muted)]">Atualize as informações do seu estabelecimento.</p>
        </div>

        {/* CONTENT */}
        <div className="grid gap-8 p-6 lg:grid-cols-[230px_1fr]">
          {/* LOGO */}
          <div>
            <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Logo
            </label>

            <label className="flex h-52 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-secondary)] transition hover:border-primary">
              {business.logo ? (
                <img src={business.logo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--border)]">
                    <ImagePlus size={24} className="text-[var(--muted)]" />
                  </div>

                  <span className="text-sm font-medium">Logo do estabelecimento</span>

                  <span className="mt-1 text-xs text-[var(--muted)]">PNG, JPG ou WebP</span>
                </>
              )}

              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogo} className="hidden" />
            </label>
          </div>

          {/* FORM */}
          <div className="grid gap-5 sm:grid-cols-2">
            {/* NOME */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Nome do estabelecimento
              </label>

              <input
                value={business.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder={categoryExamples(business.category).businessName}
              />
            </div>

            {/* TIPO DE ESPAÇO */}
            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Tipo de espaço
              </label>

              <CategoryPicker value={business.category} onChange={(category) => updateField("category", category)} />

              <p className="mt-2 text-xs text-[var(--muted)]">É a categoria em que o espaço aparece na app.</p>
            </div>

            {/* TELEFONE */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Telefone
              </label>

              <input
                value={business.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="+244 923 000 000"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                E-mail
              </label>

              <input
                type="email"
                value={business.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="contato@empresa.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* LOCALIZAÇÃO */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-lg font-semibold">Localização</h2>

          <p className="mt-1 text-sm text-[var(--muted)]">
            Marque no mapa onde fica o espaço. Na app, ele aparece a quem procurar nesta localidade, com o mapa, a
            distância e o caminho até à porta.
          </p>
        </div>

        <div className="p-6">
          <LocationMap value={business} onChange={(location) => setBusiness((prev) => ({ ...prev, ...location }))} />
        </div>
      </div>
    </div>
  );
}
