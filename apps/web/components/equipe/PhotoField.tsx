"use client";

import { ChangeEvent, useRef, useState } from "react";
import { Camera, Trash2, UserRound } from "lucide-react";

// A foto do profissional é reduzida no browser para um quadrado pequeno em JPEG e
// guardada como texto (data URL), por isso cabe no pedido e não precisa de upload à parte.
const PHOTO_SIZE = 320;
const JPEG_QUALITY = 0.78;

async function toSquarePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");

  // Recorta o quadrado central, para a foto não ficar esticada.
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

interface PhotoFieldProps {
  value: string;
  onChange: (photo: string) => void;
  disabled?: boolean;
  // A API não permite apagar a foto de um profissional já gravado, só trocá-la.
  allowRemove?: boolean;
}

export function PhotoField({ value, onChange, disabled, allowRemove = true }: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Escolha um ficheiro de imagem.");
      return;
    }

    try {
      setError("");
      onChange(await toSquarePhoto(file));
    } catch {
      setError("Não foi possível ler esta imagem.");
    }
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">Foto</label>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-50">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Foto do profissional" className="h-full w-full object-cover" />
          ) : (
            <UserRound size={30} className="text-gray-400" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Camera size={16} />
            {value ? "Trocar foto" : "Escolher foto"}
          </button>

          {value && allowRemove ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange("")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Remover
            </button>
          ) : null}
        </div>

        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>

      <p className="mt-2 text-xs text-gray-500">{error || "Aparece na app, na página do espaço e ao escolher o profissional."}</p>
    </div>
  );
}
