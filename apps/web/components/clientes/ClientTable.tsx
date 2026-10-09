"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  X,
  Pencil,
  Trash2,
  UserRound,
  Mail,
  Phone,
  CalendarDays,
  Plus,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

/*TIPOS*/

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ApiClient {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  active: boolean;
  businessId: string;
  createdAt: string;
  updatedAt: string;
  visits: number;
  totalSpent: number;
  lastVisit: string | null;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  visits: number;
  totalSpent: number;
  status: "Ativo" | "Inativo";
  lastVisit: string | null;
}

interface ClientForm {
  name: string;
  email: string;
  phone: string;
  status: "Ativo" | "Inativo";
}

const emptyForm: ClientForm = {
  name: "",
  email: "",
  phone: "",
  status: "Ativo",
};

/*COMPONENTE*/

export function ClientTable() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);

  const [editForm, setEditForm] =
    useState<Client | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingClient, setDeletingClient] =
    useState<Client | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const [addForm, setAddForm] =
    useState<ClientForm>(emptyForm);

  const [isSaving, setIsSaving] = useState(false);

  const [showAll, setShowAll] = useState(false);

  /*MODAL / SCROLL */

  const modalOpen =
    showAddModal ||
    !!selectedClient ||
    !!deletingClient;

  useEffect(() => {
    if (!modalOpen) return;

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [modalOpen]);

  /*CLIENTES VISÍVEIS*/

  const visibleClients = showAll
    ? clients
    : clients.slice(0, 5);

  /*CARREGAR */

  async function loadClients() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/clients", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Erro ao buscar clientes."
        );
      }

      const formatted: Client[] = data.map(
        (client: ApiClient) => ({
          id: client.id,
          name: client.name,
          email: client.email ?? "",
          phone: client.phone,
          visits: Number(client.visits) || 0,
          totalSpent: Number(client.totalSpent) || 0,
          status: client.active
            ? "Ativo"
            : "Inativo",
          lastVisit: client.lastVisit ?? null,
        })
      );

      setClients(formatted);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao carregar clientes."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  /* NOVO CLIENTE */

  function handleOpenAddClient() {
    setError("");
    setAddForm({ ...emptyForm });
    setShowAddModal(true);
  }

  function handleCloseAddClient() {
    if (isSaving) return;

    setShowAddModal(false);
    setAddForm({ ...emptyForm });
    setError("");
  }

  async function handleAddClient() {
    setError("");

    if (!addForm.name.trim()) {
      setError("Digite o nome do cliente.");
      return;
    }

    if (!addForm.phone.trim()) {
      setError("Digite o telefone do cliente.");
      return;
    }

    const email = addForm.email.trim();

    if (email && !EMAIL_PATTERN.test(email)) {
      setError("Digite um email válido.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetch("/api/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: email || null,
          phone: addForm.phone.trim(),
          active: addForm.status === "Ativo",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível criar o cliente."
        );
      }

      await loadClients();

      setShowAddModal(false);
      setAddForm({ ...emptyForm });

      toast.success(
        "Cliente adicionado com sucesso."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao adicionar cliente."
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* VER CLIENTE */

  function handleViewClient(client: Client) {
    setOpenMenu(null);
    setSelectedClient(client);
    setEditForm({ ...client });
    setIsEditing(false);
    setError("");
  }

  /* EDITAR */

  function handleStartEdit() {
    if (!selectedClient) return;

    setEditForm({ ...selectedClient });
    setIsEditing(true);
    setError("");
  }

  function handleCancelEdit() {
    if (!selectedClient) return;

    setEditForm({ ...selectedClient });
    setIsEditing(false);
    setError("");
  }

  function handleChange(
    field: "name" | "email" | "phone",
    value: string
  ) {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      [field]: value,
    });
  }

  function handleStatusChange(
    value: "Ativo" | "Inativo"
  ) {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      status: value,
    });
  }

  async function handleSaveEdit() {
    if (!editForm) return;

    setError("");

    if (!editForm.name.trim()) {
      setError("O nome do cliente é obrigatório.");
      return;
    }

    if (!editForm.phone.trim()) {
      setError(
        "O telefone do cliente é obrigatório."
      );
      return;
    }

    const email = editForm.email.trim();

    if (email && !EMAIL_PATTERN.test(email)) {
      setError("Digite um email válido.");
      return;
    }

    try {
      setIsUpdating(true);

      const response = await fetch(
        `/api/clients/${editForm.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: editForm.name.trim(),
            email: email || null,
            phone: editForm.phone.trim(),
            active:
              editForm.status === "Ativo",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Não foi possível atualizar o cliente."
        );
      }

      const oldClient = clients.find(
        (client) => client.id === editForm.id
      );

      const updated: Client = {
        id: data.id,
        name: data.name,
        email: data.email ?? "",
        phone: data.phone,
        visits:
          oldClient?.visits ??
          editForm.visits,
        totalSpent:
          oldClient?.totalSpent ??
          editForm.totalSpent,
        status: data.active
          ? "Ativo"
          : "Inativo",
        lastVisit:
          oldClient?.lastVisit ??
          editForm.lastVisit,
      };

      setClients((current) =>
        current.map((client) =>
          client.id === updated.id
            ? updated
            : client
        )
      );

      setSelectedClient(updated);
      setEditForm(updated);
      setIsEditing(false);

      toast.success(
        "Cliente atualizado com sucesso."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Erro ao atualizar cliente."
      );
    } finally {
      setIsUpdating(false);
    }
  }

  /*EXCLUIR*/

  function handleAskDelete(client: Client) {
    setOpenMenu(null);
    setDeletingClient(client);
    setError("");
  }

  function handleCancelDelete() {
    if (isDeleting) return;

    setDeletingClient(null);
  }

  async function handleDeleteClient() {
    if (!deletingClient) return;

    try {
      setIsDeleting(true);

      const response = await fetch(
        `/api/clients/${deletingClient.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (
          data?.reason ===
          "has_appointments"
        ) {
          setDeletingClient(null);

          toast.error(data.error, {
            duration: 10000,
          });

          return;
        }

        throw new Error(
          data?.error ||
            "Não foi possível excluir o cliente."
        );
      }

      setClients((current) =>
        current.filter(
          (client) =>
            client.id !== deletingClient.id
        )
      );

      if (
        selectedClient?.id ===
        deletingClient.id
      ) {
        setSelectedClient(null);
        setEditForm(null);
        setIsEditing(false);
      }

      setDeletingClient(null);

      toast.success(
        `${deletingClient.name} foi excluído.`
      );
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Erro ao excluir cliente."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  /*FECHAR PERFIL*/

  function handleCloseDetails() {
    if (isUpdating) return;

    setSelectedClient(null);
    setEditForm(null);
    setIsEditing(false);
    setError("");
  }

  /*FORMATADORES*/

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-AO", {
      style: "currency",
      currency: "AOA",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(date: string | null) {
    if (!date) return "Nenhuma visita";

    return new Intl.DateTimeFormat("pt-AO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  }

  /* RENDER*/

  return (
    <>
      {/*ÁREA DOS CLIENTES*/}

      <div className="w-full">

        {/*TOPO */}

        <div className="mb-5 flex items-center justify-end">

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={loadClients}
              disabled={loading}
              title="Atualizar"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${
                  loading
                    ? "animate-spin"
                    : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={handleOpenAddClient}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-700 px-4 text-xs font-semibold text-white transition hover:bg-blue-800"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo cliente
            </button>

          </div>

        </div>

        {/*   CABEÇALHO DA TABELA */}

        <div className="mb-2 hidden grid-cols-[minmax(240px,1.7fr)_minmax(150px,1fr)_110px_120px_80px] items-center rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 lg:grid">

          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Cliente
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Telefone
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Visitas
          </div>

          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Estado
          </div>

          <div className="text-right text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            Ações
          </div>

        </div>

        {/* LOADING */}

        {loading && (
          <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-gray-200 bg-white">
            <div className="text-center">

              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-50">
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              </div>

              <p className="mt-3 text-xs font-medium text-gray-600">
                A carregar clientes...
              </p>

            </div>
          </div>
        )}

        {/*ERRO */}

        {!loading &&
          error &&
          !showAddModal &&
          !selectedClient &&
          !deletingClient && (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-14 text-center">

              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                <X className="h-4 w-4 text-red-500" />
              </div>

              <p className="mt-3 text-xs font-semibold text-red-600">
                {error}
              </p>

              <button
                type="button"
                onClick={loadClients}
                className="mt-3 text-[11px] font-semibold text-gray-900 underline"
              >
                Tentar novamente
              </button>

            </div>
          )}

        {/* CLIENTES */}

        {!loading &&
          !error &&
          clients.length > 0 && (
            <div className="space-y-2">

              {visibleClients.map((client) => {
                const initial =
                  client.name
                    .charAt(0)
                    .toUpperCase();

                return (
                  <div
                    key={client.id}
                    className="group rounded-xl border border-gray-200 bg-white px-4 py-4 transition-all hover:border-gray-300 hover:shadow-sm sm:px-5"
                  >

                    {/* DESKTOP */}

                    <div className="hidden lg:grid lg:grid-cols-[minmax(240px,1.7fr)_minmax(150px,1fr)_110px_120px_80px] lg:items-center">

                      {/* CLIENTE */}

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                          {initial}
                        </div>

                        <div className="min-w-0">

                          <p className="truncate text-xs font-semibold text-gray-950">
                            {client.name}
                          </p>

                          <p className="mt-1 truncate text-[10px] text-gray-400">
                            {client.email ||
                              "Sem email"}
                          </p>

                        </div>

                      </div>

                      {/* TELEFONE */}

                      <div className="flex items-center gap-2">

                        <Phone className="h-3.5 w-3.5 text-gray-400" />

                        <span className="text-[11px] font-medium text-gray-600">
                          {client.phone}
                        </span>

                      </div>

                      {/* VISITAS */}

                      <div>

                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700">
                          <CalendarDays className="h-3 w-3 text-gray-400" />
                          {client.visits}
                        </span>

                      </div>

                      {/* ESTADO */}

                      <div>

                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            client.status ===
                            "Ativo"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              client.status ===
                              "Ativo"
                                ? "bg-green-500"
                                : "bg-gray-400"
                            }`}
                          />

                          {client.status}
                        </span>

                      </div>

                      {/* AÇÕES */}

                      <div className="relative flex justify-end">

                        <button
                          type="button"
                          onClick={() =>
                            setOpenMenu(
                              openMenu ===
                                client.id
                                ? null
                                : client.id
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
                        >
                          <span className="text-lg leading-none">
                            ⋮
                          </span>
                        </button>

                        {openMenu ===
                          client.id && (
                          <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">

                            <button
                              type="button"
                              onClick={() =>
                                handleViewClient(
                                  client
                                )
                              }
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <UserRound className="h-3.5 w-3.5 text-gray-400" />

                              Ver cliente

                              <ChevronRight className="ml-auto h-3 w-3 text-gray-300" />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleAskDelete(
                                  client
                                )
                              }
                              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />

                              Excluir
                            </button>

                          </div>
                        )}

                      </div>

                    </div>

                    {/* MOBILE */}

                    <div className="lg:hidden">

                      <div className="flex items-start justify-between gap-3">

                        <div className="flex min-w-0 items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                            {initial}
                          </div>

                          <div className="min-w-0">

                            <p className="truncate text-xs font-semibold text-gray-950">
                              {client.name}
                            </p>

                            <p className="mt-1 truncate text-[10px] text-gray-400">
                              {client.email ||
                                "Sem email"}
                            </p>

                          </div>

                        </div>

                        <div className="relative shrink-0">

                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenu(
                                openMenu ===
                                  client.id
                                  ? null
                                  : client.id
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900"
                          >
                            <span className="text-lg">
                              ⋮
                            </span>
                          </button>

                          {openMenu ===
                            client.id && (
                            <div className="absolute right-0 top-10 z-50 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">

                              <button
                                type="button"
                                onClick={() =>
                                  handleViewClient(
                                    client
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                              >
                                <UserRound className="h-3.5 w-3.5" />
                                Ver cliente
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleAskDelete(
                                    client
                                  )
                                }
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[11px] font-medium text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Excluir
                              </button>

                            </div>
                          )}

                        </div>

                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">

                        <div className="rounded-lg bg-gray-50 p-2.5">

                          <p className="text-[9px] uppercase tracking-wide text-gray-400">
                            Telefone
                          </p>

                          <p className="mt-1 truncate text-[10px] font-medium text-gray-700">
                            {client.phone}
                          </p>

                        </div>

                        <div className="rounded-lg bg-gray-50 p-2.5">

                          <p className="text-[9px] uppercase tracking-wide text-gray-400">
                            Visitas
                          </p>

                          <p className="mt-1 text-[10px] font-semibold text-gray-700">
                            {client.visits}
                          </p>

                        </div>

                        <div className="rounded-lg bg-gray-50 p-2.5">

                          <p className="text-[9px] uppercase tracking-wide text-gray-400">
                            Estado
                          </p>

                          <p
                            className={`mt-1 text-[10px] font-semibold ${
                              client.status ===
                              "Ativo"
                                ? "text-green-600"
                                : "text-gray-500"
                            }`}
                          >
                            {client.status}
                          </p>

                        </div>

                      </div>

                    </div>

                  </div>
                );
              })}

            </div>
          )}

        {/*VAZIO */}

        {!loading &&
          !error &&
          clients.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center">

              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                <UserRound className="h-5 w-5 text-gray-400" />
              </div>

              <p className="mt-4 text-sm font-semibold text-gray-950">
                Nenhum cliente
              </p>

              <p className="mt-1.5 text-xs text-gray-500">
                Adicione o primeiro cliente.
              </p>

            </div>
          )}

        {/*VER TODOS */}

        {!loading &&
          !error &&
          clients.length > 5 && (
            <div className="flex justify-center py-4">

              <button
                type="button"
                onClick={() =>
                  setShowAll(!showAll)
                }
                className="rounded-lg px-4 py-2 text-[11px] font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-950"
              >
                {showAll
                  ? "Mostrar menos"
                  : `Ver todos os ${clients.length} clientes`}
              </button>

            </div>
          )}

      </div>

      {/*  MODAL — NOVO CLIENTE*/}

      {showAddModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[3px]"
          onClick={handleCloseAddClient}
        >
          <div
            className="w-full max-w-[390px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">

              <div>
                <h2 className="text-sm font-semibold text-gray-950">
                  Novo cliente
                </h2>

                <p className="mt-1 text-[11px] text-gray-500">
                  Adicione os dados do cliente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseAddClient}
                disabled={isSaving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            <div className="space-y-4 px-5 py-5">

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                  Nome
                </label>

                <input
                  autoFocus
                  type="text"
                  value={addForm.name}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Nome completo"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                  Telefone
                </label>

                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      phone: e.target.value,
                    })
                  }
                  placeholder="923 000 000"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                  Email
                  <span className="ml-1 font-normal text-gray-400">
                    opcional
                  </span>
                </label>

                <input
                  type="email"
                  value={addForm.email}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="cliente@email.com"
                  className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                  Estado
                </label>

                <select
                  value={addForm.status}
                  onChange={(e) =>
                    setAddForm({
                      ...addForm,
                      status:
                        e.target.value as
                          | "Ativo"
                          | "Inativo",
                    })
                  }
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                >
                  <option value="Ativo">
                    Ativo
                  </option>

                  <option value="Inativo">
                    Inativo
                  </option>
                </select>
              </div>

              {error && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-[11px] text-red-600">
                  {error}
                </div>
              )}

            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">

              <button
                type="button"
                onClick={handleCloseAddClient}
                disabled={isSaving}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleAddClient}
                disabled={isSaving}
                className="h-9 rounded-lg bg-gray-950 px-4 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isSaving
                  ? "A guardar..."
                  : "Adicionar"}
              </button>

            </div>

          </div>
        </div>
      )}

      {/*MODAL — PERFIL / EDITAR*/}

      {selectedClient && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[3px]"
          onClick={handleCloseDetails}
        >
          <div
            className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">

              <div>
                <h2 className="text-sm font-semibold text-gray-950">
                  {isEditing
                    ? "Editar cliente"
                    : "Perfil do cliente"}
                </h2>

                <p className="mt-1 text-[11px] text-gray-500">
                  {isEditing
                    ? "Atualize os dados."
                    : "Informações do cliente."}
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseDetails}
                disabled={isUpdating}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>

            </div>

            {isEditing && editForm ? (
              <div className="space-y-4 px-5 py-5">

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                    Nome
                  </label>

                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      handleChange(
                        "name",
                        e.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                    Telefone
                  </label>

                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      handleChange(
                        "phone",
                        e.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      handleChange(
                        "email",
                        e.target.value
                      )
                    }
                    className="h-10 w-full rounded-lg border border-gray-200 px-3 text-xs outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold text-gray-700">
                    Estado
                  </label>

                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      handleStatusChange(
                        e.target.value as
                          | "Ativo"
                          | "Inativo"
                      )
                    }
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-100"
                  >
                    <option value="Ativo">
                      Ativo
                    </option>

                    <option value="Inativo">
                      Inativo
                    </option>
                  </select>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 px-3 py-2.5 text-[11px] text-red-600">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">

                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="h-9 rounded-lg border border-gray-200 px-3.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isUpdating}
                    className="h-9 rounded-lg bg-gray-950 px-4 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {isUpdating
                      ? "A guardar..."
                      : "Guardar"}
                  </button>

                </div>

              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-5">

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-base font-bold text-gray-700">
                    {selectedClient.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">

                    <h3 className="truncate text-sm font-semibold text-gray-950">
                      {selectedClient.name}
                    </h3>

                    <p className="mt-1 text-[11px] text-gray-500">
                      {selectedClient.phone}
                    </p>

                  </div>

                  <span
                    className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                      selectedClient.status ===
                      "Ativo"
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedClient.status ===
                        "Ativo"
                          ? "bg-green-500"
                          : "bg-gray-400"
                      }`}
                    />

                    {selectedClient.status}
                  </span>

                </div>

                <div className="grid grid-cols-3 gap-2 border-y border-gray-100 bg-gray-50/50 px-5 py-4">

                  <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">

                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />

                    <p className="mt-2 text-base font-bold text-gray-950">
                      {selectedClient.visits}
                    </p>

                    <p className="mt-1 text-[9px] text-gray-500">
                      Visitas
                    </p>

                  </div>

                  <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">

                    <span className="text-[10px] font-bold text-gray-400">
                      Kz
                    </span>

                    <p className="mt-2 truncate text-sm font-bold text-gray-950">
                      {formatCurrency(
                        selectedClient.totalSpent
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-gray-500">
                      Total gasto
                    </p>

                  </div>

                  <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">

                    <CalendarDays className="h-3.5 w-3.5 text-gray-400" />

                    <p className="mt-2 truncate text-[11px] font-bold text-gray-950">
                      {formatDate(
                        selectedClient.lastVisit
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-gray-500">
                      Última visita
                    </p>

                  </div>

                </div>

                <div className="px-5 py-5">

                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                    Contacto
                  </p>

                  <div className="grid grid-cols-2 gap-2">

                    <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3">

                      <div className="flex items-center gap-1.5 text-gray-400">

                        <Mail className="h-3 w-3" />

                        <span className="text-[9px] font-medium uppercase">
                          Email
                        </span>

                      </div>

                      <p className="mt-2 break-all text-[11px] font-semibold text-gray-900">
                        {selectedClient.email ||
                          "Sem email"}
                      </p>

                    </div>

                    <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3">

                      <div className="flex items-center gap-1.5 text-gray-400">

                        <Phone className="h-3 w-3" />

                        <span className="text-[9px] font-medium uppercase">
                          Telefone
                        </span>

                      </div>

                      <p className="mt-2 text-[11px] font-semibold text-gray-900">
                        {selectedClient.phone}
                      </p>

                    </div>

                  </div>

                </div>

                <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-3.5">

                  <button
                    type="button"
                    onClick={handleStartEdit}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseDetails}
                    className="h-9 rounded-lg bg-gray-950 px-4 text-xs font-semibold text-white hover:bg-gray-800"
                  >
                    Fechar
                  </button>

                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/*MODAL — EXCLUIR*/}

      {deletingClient && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-4 backdrop-blur-[3px]"
          onClick={handleCancelDelete}
        >
          <div
            className="w-full max-w-[360px] rounded-2xl border border-gray-100 bg-white p-5 shadow-2xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-4 w-4" />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-gray-950">
              Excluir cliente?
            </h2>

            <p className="mt-1.5 text-[11px] leading-5 text-gray-500">
              Tem certeza que deseja excluir{" "}
              <span className="font-semibold text-gray-900">
                {deletingClient.name}
              </span>
              ? Esta ação não poderá ser desfeita.
            </p>

            <div className="mt-5 flex justify-end gap-2">

              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="h-9 rounded-lg border border-gray-200 px-3.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />

                {isDeleting
                  ? "A excluir..."
                  : "Excluir"}
              </button>

            </div>

          </div>
        </div>
      )}
    </>
  );
}