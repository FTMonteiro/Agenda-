"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  X,
  Save,
} from "lucide-react";

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  active: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
}

interface ServicesListProps {
  services: Service[];

  /*
  OWNER
|
  
   Necessário apenas quando o proprietário está
   a gerir os serviços.
  
  */

  onServicesChange?: (
    updater:
      | Service[]
      | ((current: Service[]) => Service[]),
  ) => void;

  /*
  READ ONLY

  EMPLOYEE:
  
  rue → somente visualização
  
  false → gestão completa
  
  */

  readOnly?: boolean;
}

export default function ServicesList({
  services,
  onServicesChange,
  readOnly = false,
}: ServicesListProps) {
  /*
  ESTADOS
|
  */

  const [query, setQuery] =
    useState("");

  const [openMenu, setOpenMenu] =
    useState<string | null>(null);

  const [editingService, setEditingService] =
    useState<Service | null>(null);

  const [deletingService, setDeletingService] =
    useState<Service | null>(null);

  const [loadingId, setLoadingId] =
    useState<string | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editDescription, setEditDescription] =
    useState("");

  const [editPrice, setEditPrice] =
    useState("");

  const [editDuration, setEditDuration] =
    useState("");

  /*
  PESQUISA
|
  */

  const filteredServices = useMemo(() => {
    const normalizedQuery =
      query.trim().toLowerCase();

    if (!normalizedQuery) {
      return services;
    }

    return services.filter(
      (service) => {
        const name =
          service.name?.toLowerCase() ??
          "";

        const description =
          service.description?.toLowerCase() ??
          "";

        return (
          name.includes(
            normalizedQuery,
          ) ||
          description.includes(
            normalizedQuery,
          )
        );
      },
    );
  }, [services, query]);

  /*
  FORMATAR PREÇO
|
  */

  function formatPrice(
    price: number,
  ) {
    return new Intl.NumberFormat(
      "pt-AO",
      {
        style: "currency",
        currency: "AOA",
        minimumFractionDigits: 2,
      },
    ).format(price);
  }

  /*
  ABRIR MENU
|
  */

  function handleOpenMenu(
    id: string,
  ) {
    /*
     * Segurança adicional:
     * funcionário nunca deve abrir menu.
     */

    if (readOnly) {
      return;
    }

    setOpenMenu((current) =>
      current === id ? null : id,
    );
  }

  /*
  ABRIR EDIÇÃO
|
  */

  function openEdit(
    service: Service,
  ) {
    /*
     * Funcionário não pode editar.
     */

    if (readOnly) {
      return;
    }

    setEditingService(service);

    setEditName(service.name);

    setEditDescription(
      service.description ?? "",
    );

    setEditPrice(
      String(service.price),
    );

    setEditDuration(
      String(service.duration),
    );

    setOpenMenu(null);
  }

  /*
  EDITAR SERVIÇO
|
  */

  async function handleEdit() {
    /*
     * Segurança adicional.
     */

    if (
      readOnly ||
      !editingService ||
      !onServicesChange
    ) {
      return;
    }

    const name =
      editName.trim();

    const description =
      editDescription.trim();

    const price =
      Number(editPrice);

    const duration =
      Number(editDuration);

    /*
    VALIDAÇÕES
|
    */

    if (!name) {
      toast.error(
        "O nome do serviço é obrigatório.",
      );

      return;
    }

    if (
      !editPrice.trim() ||
      Number.isNaN(price) ||
      price <= 0
    ) {
      toast.error(
        "Informe o preço do serviço. Tem de ser maior que zero.",
      );

      return;
    }

    if (
      Number.isNaN(duration) ||
      duration <= 0
    ) {
      toast.error(
        "Informe uma duração válida.",
      );

      return;
    }

    try {
      setLoadingId(
        editingService.id,
      );

      const response =
        await fetch(
          `/api/services/${editingService.id}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,

              description:
                description || null,

              price,

              duration,

              active:
                editingService.active,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível editar o serviço.",
        );
      }

      /*
      NORMALIZAR
|
      */

      const updatedService: Service =
        {
          ...data,

          price: Number(
            data.price,
          ),

          duration: Number(
            data.duration,
          ),
        };

      /*
      ATUALIZAR LISTA
|
      */

      onServicesChange(
        (current) =>
          current.map(
            (service) =>
              service.id ===
              updatedService.id
                ? updatedService
                : service,
          ),
      );

      /*
      FECHAR MODAL
|
      */

      setEditingService(null);

      toast.success(
        "Serviço atualizado com sucesso.",
      );
    } catch (error) {
      console.error(
        "Erro ao editar serviço:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao editar serviço.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /*
  ATIVAR / DESATIVAR SERVIÇO
|
  */

  async function handleToggleActive(
    service: Service,
  ) {
    /*
     * Funcionário não pode alterar.
     */

    if (
      readOnly ||
      !onServicesChange
    ) {
      return;
    }

    try {
      setLoadingId(service.id);

      setOpenMenu(null);

      const response =
        await fetch(
          `/api/services/${service.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              active:
                !service.active,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível alterar o estado do serviço.",
        );
      }

      /*
      NORMALIZAR
|
      */

      const updatedService: Service =
        {
          ...data,

          price: Number(
            data.price,
          ),

          duration: Number(
            data.duration,
          ),
        };

      /*
      ATUALIZAR LISTA
|
      */

      onServicesChange(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              updatedService.id
                ? updatedService
                : item,
          ),
      );

      toast.success(
        updatedService.active
          ? "Serviço ativado."
          : "Serviço desativado.",
      );
    } catch (error) {
      console.error(
        "Erro ao alterar serviço:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao alterar serviço.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /*
  ABRIR CONFIRMAÇÃO DE EXCLUSÃO
|
  */

  function openDelete(
    service: Service,
  ) {
    /*
     * Funcionário não pode excluir.
     */

    if (readOnly) {
      return;
    }

    setDeletingService(service);

    setOpenMenu(null);
  }

  /*
  EXCLUIR SERVIÇO
|
  */

  async function handleDelete() {
    /*
     * Segurança adicional.
     */

    if (
      readOnly ||
      !deletingService ||
      !onServicesChange
    ) {
      return;
    }

    try {
      setLoadingId(
        deletingService.id,
      );

      const response =
        await fetch(
          `/api/services/${deletingService.id}`,
          {
            method: "DELETE",
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível excluir o serviço.",
        );
      }

      /*
      REMOVER DA LISTA
|
      */

      onServicesChange(
        (current) =>
          current.filter(
            (service) =>
              service.id !==
              deletingService.id,
          ),
      );

      setDeletingService(null);

      toast.success(
        "Serviço excluído com sucesso.",
      );
    } catch (error) {
      console.error(
        "Erro ao excluir serviço:",
        error,
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro ao excluir serviço.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  /*
  RENDER
|
  */

  return (
    <>
      {/* LISTA */}

      <section className="rounded-3xl border border-gray-200 bg-white shadow-sm">
        {/* HEADER */}

        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">
              Lista de serviços
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {readOnly
                ? "Serviços disponíveis para atendimento."
                : "Gerencie os serviços do estabelecimento."}
            </p>
          </div>

          {/* PESQUISA */}

          <div className="relative w-full md:w-80">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
              placeholder="Pesquisar serviço..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/* SERVIÇOS */}

        <div className="divide-y divide-gray-100">
          {filteredServices.length ===
          0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-700">
                Nenhum serviço encontrado.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {readOnly
                  ? "Não existem serviços ativos disponíveis."
                  : "Tente pesquisar por outro nome."}
              </p>
            </div>
          ) : (
            filteredServices.map(
              (service) => {
                const isLoading =
                  loadingId ===
                  service.id;

                return (
                  <div
                    key={service.id}
                    className="relative flex flex-col gap-4 p-5 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                  >
                    {/* INFORMAÇÕES */}

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="truncate font-semibold text-gray-950">
                          {
                            service.name
                          }
                        </h3>

                        {service.active ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Ativo
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                            Inativo
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        {service.description ||
                          "Sem descrição"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm">
                        <span className="font-semibold text-gray-900">
                          {formatPrice(
                            service.price,
                          )}
                        </span>

                        <span className="text-gray-500">
                          {
                            service.duration
                          }{" "}
                          minutos
                        </span>
                      </div>
                    </div>

                    {/* AÇÕES DO OWNER */}

                    {!readOnly && (
                      <div className="relative flex items-center justify-end">
                        <button
                          type="button"
                          disabled={
                            isLoading
                          }
                          onClick={() =>
                            handleOpenMenu(
                              service.id,
                            )
                          }
                          className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Abrir ações"
                        >
                          <MoreHorizontal
                            size={20}
                          />
                        </button>

                        {/* MENU */}

                        {openMenu ===
                          service.id && (
                          <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                            {/* EDITAR */}

                            <button
                              type="button"
                              disabled={
                                isLoading
                              }
                              onClick={() =>
                                openEdit(
                                  service,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Pencil
                                size={16}
                              />

                              Editar
                            </button>

                            {/* ATIVAR / DESATIVAR */}

                            <button
                              type="button"
                              disabled={
                                isLoading
                              }
                              onClick={() =>
                                handleToggleActive(
                                  service,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                            >
                              <Power
                                size={16}
                              />

                              {service.active
                                ? "Desativar"
                                : "Ativar"}
                            </button>

                            {/* EXCLUIR */}

                            <button
                              type="button"
                              disabled={
                                isLoading
                              }
                              onClick={() =>
                                openDelete(
                                  service,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                            >
                              <Trash2
                                size={16}
                              />

                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            )
          )}
        </div>
      </section>

      {/* MODAL EDITAR — SOMENTE OWNER */}

      {!readOnly &&
        editingService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl">
              {/* HEADER */}

              <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-950">
                    Editar serviço
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Atualize os dados do
                    serviço.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setEditingService(
                      null,
                    )
                  }
                  className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORMULÁRIO */}

              <div className="space-y-5 p-6">
                {/* NOME */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nome
                  </label>

                  <input
                    type="text"
                    value={
                      editName
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditName(
                        event.target
                          .value,
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                {/* DESCRIÇÃO */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Descrição
                  </label>

                  <textarea
                    value={
                      editDescription
                    }
                    onChange={(
                      event,
                    ) =>
                      setEditDescription(
                        event
                          .target
                          .value,
                      )
                    }
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500"
                  />
                </div>

                {/* PREÇO / DURAÇÃO */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Preço
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        editPrice
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditPrice(
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Duração
                    </label>

                    <input
                      type="number"
                      min="1"
                      value={
                        editDuration
                      }
                      onChange={(
                        event,
                      ) =>
                        setEditDuration(
                          event
                            .target
                            .value,
                        )
                      }
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
                <button
                  type="button"
                  onClick={() =>
                    setEditingService(
                      null,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    loadingId ===
                    editingService.id
                  }
                  onClick={
                    handleEdit
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save
                    size={16}
                  />

                  {loadingId ===
                  editingService.id
                    ? "A guardar..."
                    : "Guardar alterações"}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* MODAL EXCLUIR — SOMENTE OWNER */}

      {!readOnly &&
        deletingService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
              {/* ÍCONE */}

              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
                <Trash2
                  size={22}
                  className="text-red-600"
                />
              </div>

              {/* TÍTULO */}

              <h2 className="mt-5 text-xl font-bold text-gray-950">
                Excluir serviço?
              </h2>

              {/* DESCRIÇÃO */}

              <p className="mt-2 text-sm leading-6 text-gray-500">
                Tem certeza que deseja
                excluir o serviço{" "}
                <strong className="text-gray-800">
                  {
                    deletingService.name
                  }
                </strong>
                ?
                <br />
                Esta ação não pode
                ser desfeita.
              </p>

              {/* BOTÕES */}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setDeletingService(
                      null,
                    )
                  }
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  disabled={
                    loadingId ===
                    deletingService.id
                  }
                  onClick={
                    handleDelete
                  }
                  className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingId ===
                  deletingService.id
                    ? "A excluir..."
                    : "Sim, excluir"}
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
}