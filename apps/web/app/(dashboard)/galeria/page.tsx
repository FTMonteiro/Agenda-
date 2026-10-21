"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Grid2X2,
  ImagePlus,
  Images,
  Maximize2,
  MoreHorizontal,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PageActions } from "@/components/ui/PageActions";
import { toast } from "sonner";
import { confirmAction } from "@/lib/confirm-action";
import { shrinkImage } from "@/lib/shrink-image";

interface GalleryImage {
  id: string;
  name: string;
  url: string;
  isCover: boolean;
  size: number;
  createdAt: number;
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;



function formatFileSize(size: number) {
  if (!size) {
    return "";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}


export default function GaleriaPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const coverImage = useMemo(
    () => images.find((image) => image.isCover) ?? images[0] ?? null,
    [images]
  );

  const selectedImage =
    selectedIndex !== null
      ? images[selectedIndex] ?? null
      : null;

  /*CARREGAR GALERIA*/

  // As imagens ficam guardadas na API (não no browser), por isso são as mesmas que
  // aparecem na página do espaço na app.
  const loadGallery = useCallback(async () => {
    try {
      const response = await fetch("/api/galeria", { cache: "no-store" });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível carregar a galeria.");
      }

      setImages(Array.isArray(data?.images) ? data.images : []);
    } catch (error) {
      console.error("Erro ao carregar galeria:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    void loadGallery();
  }, [loadGallery]);

  /*TECLADO DO MODAL*/
  useEffect(() => {
    if (selectedIndex === null) return;

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
        return;
      }

      if (event.key === "ArrowRight") {
        setSelectedIndex((current) => {
          if (
            current === null ||
            images.length === 0
          ) {
            return current;
          }

          return (current + 1) % images.length;
        });

        return;
      }

      if (event.key === "ArrowLeft") {
        setSelectedIndex((current) => {
          if (
            current === null ||
            images.length === 0
          ) {
            return current;
          }

          return (
            (current - 1 + images.length) %
            images.length
          );
        });
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [selectedIndex, images.length]);

  /*ABRIR EXPLORADOR DE FICHEIROS*/
  const handleOpenFilePicker = () => {
    inputRef.current?.click();
  };

  /*PROCESSAR FICHEIROS*/
  const processFiles = async (files: File[]) => {
    const imageFiles = files.filter((file) =>
      file.type.startsWith("image/")
    );

    if (imageFiles.length === 0) {
      toast.error("Selecione pelo menos uma imagem.");
      return;
    }

    const validFiles = imageFiles.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          `A imagem "${file.name}" ultrapassa o limite de 20 MB e foi ignorada.`
        );

        return false;
      }

      return true;
    });

    if (validFiles.length === 0) {
      return;
    }

    setIsUploading(true);

    try {
      for (const file of validFiles) {
        const prepared = await shrinkImage(file);

        const body = new FormData();
        body.append("file", prepared);

        const response = await fetch("/api/galeria", { method: "POST", body });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || `Não foi possível carregar "${file.name}".`);
        }

        setImages((current) => [...current, { ...data.image, size: prepared.size }]);
      }
    } catch (error) {
      console.error(
        "Erro ao carregar imagens:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar uma ou mais imagens."
      );
    } finally {
      setIsUploading(false);
    }
  };

  /*INPUT DE FICHEIROS*/
  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(
      event.target.files ?? []
    );

    await processFiles(files);

    /*
     * Permite selecionar novamente a mesma imagem
     * depois de já ter sido selecionada.
     */
    event.target.value = "";
  };

  /*DRAG OVER*/
  const handleDragOver = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(true);
  };

  /*DRAG LEAVE*/
  const handleDragLeave = (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);
  };

  /*DROP*/
  const handleDrop = async (
    event: DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsDragging(false);

    const files = Array.from(
      event.dataTransfer.files ?? []
    );

    await processFiles(files);
  };

  /*DEFINIR FOTO DE CAPA*/
  const setCover = async (id: string) => {
    setMenuOpen(null);

    const response = await fetch(`/api/galeria/${id}/cover`, { method: "PATCH" });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error || "Não foi possível definir a capa.");
      return;
    }

    setImages(Array.isArray(data?.images) ? data.images : []);
    setSelectedIndex(null);
  };

  /*ELIMINAR IMAGEM*/
  const deleteImage = async (id: string) => {
    const image = images.find(
      (item) => item.id === id
    );

    if (!image) return;

    const confirmed = await confirmAction(
      `Eliminar "${image.name}"?`,
      "Eliminar"
    );

    if (!confirmed) return;

    setMenuOpen(null);

    const response = await fetch(`/api/galeria/${id}`, { method: "DELETE" });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(data?.error || "Não foi possível eliminar a imagem.");
      return;
    }

    setImages(Array.isArray(data?.images) ? data.images : []);

    if (selectedImage?.id === id) {
      setSelectedIndex(null);
    }
  };

  /*LIMPAR GALERIA */
  const clearGallery = async () => {
    if (images.length === 0) return;

    const confirmed = await confirmAction(
      "Eliminar todas as fotos da galeria?",
      "Eliminar tudo"
    );

    if (!confirmed) return;

    setSelectedIndex(null);
    setMenuOpen(null);

    for (const image of images) {
      await fetch(`/api/galeria/${image.id}`, { method: "DELETE" }).catch(() => null);
    }

    await loadGallery();
  };

  /** ABRIR IMAGEM */
  const openImage = (index: number) => {
    if (index < 0) return;

    setSelectedIndex(index);
    setMenuOpen(null);
  };

  /*IMAGEM ANTERIOR */
  const previousImage = () => {
    setSelectedIndex((current) => {
      if (
        current === null ||
        images.length === 0
      ) {
        return current;
      }

      return (
        (current - 1 + images.length) %
        images.length
      );
    });
  };

  /*PRÓXIMA IMAGEM*/
  const nextImage = () => {
    setSelectedIndex((current) => {
      if (
        current === null ||
        images.length === 0
      ) {
        return current;
      }

      return (current + 1) % images.length;
    });
  };

  /* RENDER*/
  return (
    <main className="min-h-full">
      <div className="mx-auto max-w-7xl">

        {/* AÇÕES */}
        {images.length > 0 && (
          <div className="mb-8">
            <PageActions>
              <button
                type="button"
                onClick={clearGallery}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
              >
                <Trash2 size={18} />
                Limpar galeria
              </button>
            </PageActions>
          </div>
        )}

        {/* INPUT ESCONDIDO ESTE É O QUE ABRE O EXPLORADOR */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        {/* ESTATÍSTICAS */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">

          {/* TOTAL */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                <Images size={21} />
              </div>

              <span className="text-xs font-medium text-[var(--muted)]">
                Total
              </span>
            </div>

            <p className="mt-5 text-2xl font-semibold text-[var(--foreground)]">
              {images.length}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              {images.length === 1
                ? "imagem adicionada"
                : "imagens adicionadas"}
            </p>
          </div>

          {/* CAPA */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                <Star size={21} />
              </div>

              <span className="text-xs font-medium text-[var(--muted)]">
                Destaque
              </span>
            </div>

            <p className="mt-5 text-2xl font-semibold text-[var(--foreground)]">
              {coverImage ? "1" : "0"}
            </p>

            <p className="mt-1 truncate text-xs text-[var(--muted)]">
              {coverImage
                ? "foto de capa definida"
                : "nenhuma capa definida"}
            </p>
          </div>

          {/* ESTADO */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                <Check size={21} />
              </div>

              <span className="text-xs font-medium text-[var(--muted)]">
                Estado
              </span>
            </div>

            <p className="mt-5 text-2xl font-semibold text-[var(--foreground)]">
              {images.length > 0
                ? "Ativa"
                : "Vazia"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Galeria do espaço
            </p>
          </div>

          {/* APRESENTAÇÃO */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                <Images size={21} />
              </div>

              <span className="text-xs font-medium text-[var(--muted)]">
                Apresentação
              </span>
            </div>

            <p className="mt-5 text-2xl font-semibold text-[var(--foreground)]">
              {images.length >= 3
                ? "Boa"
                : images.length > 0
                ? "Inicial"
                : "—"}
            </p>

            <p className="mt-1 text-xs text-[var(--muted)]">
              Qualidade da galeria
            </p>
          </div>
        </section>

        {/*FOTO DE DESTAQUE*/}
        {coverImage && (
          <section className="mb-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">

            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Foto de destaque
                </h2>

                <p className="mt-1 text-xs text-[var(--muted)]">
                  A imagem principal apresentada no seu espaço.
                </p>
              </div>

              <div className="hidden items-center gap-2 rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] sm:flex">
                <Star
                  size={14}
                  fill="currentColor"
                />
                Capa
              </div>
            </div>

            <div className="relative h-[300px] overflow-hidden sm:h-[390px] lg:h-[460px]">
              <img
                src={coverImage.url}
                alt={coverImage.name}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wider text-white/60">
                      Imagem principal
                    </p>

                    <h3 className="max-w-xl truncate text-xl font-semibold text-white sm:text-2xl">
                      {coverImage.name}
                    </h3>

                    <p className="mt-1 text-xs text-white/60">
                      {formatFileSize(
                        coverImage.size
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openImage(
                        images.findIndex(
                          (image) =>
                            image.id ===
                            coverImage.id
                        )
                      )
                    }
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition hover:bg-white/25"
                    aria-label="Visualizar foto"
                  >
                    <Maximize2 size={19} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ÁREA DE UPLOAD  TODA ESTA ÁREA É CLICÁVEL*/}
        <section
          onClick={handleOpenFilePicker}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`mb-8 cursor-pointer rounded-2xl border border-dashed transition ${
            isDragging
              ? "border-[var(--primary)] bg-[var(--surface-secondary)]"
              : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--foreground)] hover:bg-[var(--surface-secondary)]"
          }`}
        >
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14">

            <div
              className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                isDragging
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--surface-secondary)] text-[var(--foreground)]"
              }`}
            >
              {isDragging ? (
                <CloudUpload size={24} />
              ) : (
                <ImagePlus size={24} />
              )}
            </div>

            <h2 className="mt-5 text-lg font-semibold text-[var(--foreground)]">
              {isDragging
                ? "Solte as imagens aqui"
                : "Adicione fotos à sua galeria"}
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Arraste e solte as imagens aqui ou
              escolha os ficheiros diretamente no seu
              computador.
            </p>

            {/* BOTÃO */}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleOpenFilePicker();
              }}
              disabled={isUploading}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Upload size={19} />

              {isUploading
                ? "A carregar imagens..."
                : "Selecionar imagens"}
            </button>

            <p className="mt-3 text-[11px] text-[var(--muted)]">
              PNG, JPG, JPEG ou WEBP · máximo 10 MB por imagem
            </p>
          </div>
        </section>

        {/*GALERIA */}
        {images.length > 0 && (
          <section>

            <div className="mb-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">
                    As suas fotos
                  </h2>

                  <span className="rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs font-medium text-[var(--muted)]">
                    {images.length}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  Organize e escolha a melhor apresentação
                  para o seu espaço.
                </p>
              </div>

              <div className="hidden items-center gap-2 text-xs text-[var(--muted)] sm:flex">
                <Grid2X2 size={17} />
                Galeria
              </div>
            </div>

            {/* GRID */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

              {images.map((image, index) => (
                <article
                  key={image.id}
                  className="group relative overflow-visible"
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-secondary)]">

                    {/* IMAGEM */}
                    <button
                      type="button"
                      onClick={() =>
                        openImage(index)
                      }
                      className="absolute inset-0 z-0"
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                    </button>

                    {/* CAPA */}
                    {image.isCover && (
                      <div className="absolute left-2.5 top-2.5 z-10">
                        <div className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-neutral-900 shadow-lg">
                          <Star
                            size={12}
                            fill="currentColor"
                          />
                          Capa
                        </div>
                      </div>
                    )}

                    {/* MENU */}
                    <div className="absolute right-2.5 top-2.5 z-20">

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();

                          setMenuOpen(
                            (current) =>
                              current === image.id
                                ? null
                                : image.id
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white opacity-0 transition group-hover:opacity-100 hover:bg-black/50"
                        aria-label="Opções da imagem"
                      >
                        <MoreHorizontal size={18} />
                      </button>

                      {menuOpen === image.id && (
                        <div className="absolute right-0 top-10 z-50 w-48 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-xl">

                          {!image.isCover && (
                            <button
                              type="button"
                              onClick={() =>
                                setCover(
                                  image.id
                                )
                              }
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
                            >
                              <Star size={17} />
                              Definir como capa
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              openImage(index)
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-secondary)]"
                          >
                            <Maximize2 size={17} />
                            Visualizar
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteImage(
                                image.id
                              )
                            }
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 size={17} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>

                    {/* OVERLAY */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/60 to-transparent px-3 pb-3 pt-8 opacity-0 transition group-hover:opacity-100">
                      <p className="truncate text-xs font-medium text-white">
                        {image.name}
                      </p>

                      <p className="mt-0.5 text-[11px] text-white/60">
                        {formatFileSize(
                          image.size
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {/*CARD ADICIONAR*/}
              <button
                type="button"
                onClick={handleOpenFilePicker}
                className="group aspect-square overflow-hidden rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--foreground)] hover:bg-[var(--surface-secondary)]"
              >
                <div className="flex h-full flex-col items-center justify-center px-4 text-center">

                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)] transition">
                    <ImagePlus size={22} />
                  </div>

                  <span className="mt-3 text-xs font-semibold text-[var(--foreground)]">
                    Adicionar foto
                  </span>

                  <span className="mt-1 text-[11px] text-[var(--muted)]">
                    Clique para selecionar
                  </span>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* ESTADO VAZIO*/}
        {images.length === 0 && (
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center sm:py-16">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
              <Camera size={25} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-[var(--foreground)]">
              A sua galeria está vazia
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              Comece adicionando fotografias do seu
              espaço para criar uma apresentação
              profissional.
            </p>

            <button
              type="button"
              onClick={handleOpenFilePicker}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <ImagePlus size={19} />
              Adicionar primeira foto
            </button>
          </section>
        )}

        {/* INFORMAÇÃO*/}
        {images.length > 0 && (
          <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">

            <div className="flex gap-4">

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-secondary)] text-[var(--foreground)]">
                <Images size={20} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Dica para uma galeria profissional
                </h3>

                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">
                  Utilize fotografias claras e de boa
                  qualidade. Mostre diferentes ângulos
                  do espaço, detalhes dos serviços e
                  momentos que transmitam a experiência
                  que oferece aos seus clientes.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      {/*  MODAL DE IMAGEM*/}
      {selectedImage &&
        selectedIndex !== null && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
            onClick={() =>
              setSelectedIndex(null)
            }
            role="dialog"
            aria-modal="true"
          >

            {/* FECHAR */}
            <button
              type="button"
              onClick={() =>
                setSelectedIndex(null)
              }
              className="absolute right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6 sm:top-6"
              aria-label="Fechar"
            >
              <X size={22} />
            </button>

            {/* TÍTULO */}
            <div className="absolute left-5 top-5 z-20 max-w-[65%] sm:left-7 sm:top-7">
              <p className="truncate text-sm font-medium text-white">
                {selectedImage.name}
              </p>

              <p className="mt-1 text-xs text-white/50">
                {selectedIndex + 1} de{" "}
                {images.length}
              </p>
            </div>

            {/* IMAGEM */}
            <div
              className="relative flex max-h-[82vh] max-w-[90vw] items-center justify-center"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <img
                src={selectedImage.url}
                alt={selectedImage.name}
                className="max-h-[82vh] max-w-[90vw] rounded-xl object-contain shadow-xl"
              />
            </div>

            {/* ANTERIOR */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  previousImage();
                }}
                className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-6 sm:h-12 sm:w-12"
                aria-label="Imagem anterior"
              >
                <ChevronLeft size={24} />
              </button>
            )}

            {/* PRÓXIMA */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  nextImage();
                }}
                className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-6 sm:h-12 sm:w-12"
                aria-label="Próxima imagem"
              >
                <ChevronRight size={24} />
              </button>
            )}

            {/* CONTROLOS */}
            <div
              className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1.5"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <button
                type="button"
                onClick={previousImage}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
                aria-label="Anterior"
              >
                <ArrowLeft size={18} />
              </button>

              <button
                type="button"
                onClick={() =>
                  setCover(
                    selectedImage.id
                  )
                }
                className={`flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition ${
                  selectedImage.isCover
                    ? "bg-white text-black"
                    : "text-white hover:bg-white/10"
                }`}
              >
                <Star
                  size={14}
                  fill={
                    selectedImage.isCover
                      ? "currentColor"
                      : "none"
                  }
                />

                {selectedImage.isCover
                  ? "Capa"
                  : "Definir como capa"}
              </button>

              <button
                type="button"
                onClick={() =>
                  deleteImage(
                    selectedImage.id
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-red-500/20 hover:text-red-300"
                aria-label="Eliminar imagem"
              >
                <Trash2 size={17} />
              </button>

              <button
                type="button"
                onClick={nextImage}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition hover:bg-white/10"
                aria-label="Próxima"
              >
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}
    </main>
  );
}