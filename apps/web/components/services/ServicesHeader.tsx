"use client";

import { FormEvent, useState } from "react";
import { toast } from "sonner";

import {
  X,
  Plus,
  Loader2,
} from "lucide-react";
import { PageActions, brandButton } from "@/components/ui/PageActions";

import { useCategoryExamples } from "@/lib/category-examples";
import type { Service } from "@/types/service";

interface ServicesHeaderProps {
  onServiceCreated: (service: Service) => void;
}

export default function ServicesHeader({
  onServiceCreated,
}: ServicesHeaderProps) {
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const examples = useCategoryExamples();
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setDuration("30");
    setError("");
  }

  function closeModal() {
    if (saving) return;

    setOpen(false);
    resetForm();
  }

  async function handleCreateService(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    /*
     * Validação no cliente. Antes só existiam os `required` do HTML, que não
     * cobrem preço zero — e `Number("")` é 0, então um campo vazio passava.
     */

    const cleanName = name.trim();

    const numericPrice = Number(price);

    const numericDuration = Number(duration);

    if (!cleanName) {
      toast.error("Informe o nome do serviço.");
      return;
    }

    if (!price.trim() || !Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error("Informe o preço do serviço. Tem de ser maior que zero.");
      return;
    }

    if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
      toast.error("Informe a duração do serviço em minutos.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch("/api/services", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: cleanName,
          description: description.trim(),
          price: numericPrice,
          duration: numericDuration,
          active: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível criar o serviço.");
      }

      onServiceCreated(data);

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);

      const message =
        error instanceof Error ? error.message : "Erro ao criar serviço.";

      setError(message);

      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageActions>
          <button type="button" onClick={() => setOpen(true)} className={brandButton}>
            <Plus size={20} />
            Novo serviço
          </button>
      </PageActions>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-6">
              <div>
                <h2 className="text-lg font-bold text-gray-950">
                  Novo serviço
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Cadastre um novo serviço.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-5 p-6">
              {error && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nome
                </label>

                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-gray-950"
                  placeholder={examples.serviceName}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descrição
                </label>

                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="mt-1 w-full resize-none rounded-xl border px-3 py-2.5 outline-none focus:border-gray-950"
                  placeholder={examples.serviceDescription}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Preço
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    required
                    className="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-gray-950"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Duração
                  </label>

                  <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2.5 outline-none focus:border-gray-950"
                  >
                    <option value="15">15 minutos</option>

                    <option value="30">30 minutos</option>

                    <option value="45">45 minutos</option>

                    <option value="60">1 hora</option>

                    <option value="90">1h30</option>

                    <option value="120">2 horas</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  Criar serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
