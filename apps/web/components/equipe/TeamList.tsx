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
  KeyRound,
} from "lucide-react";
import { PhotoField } from "./PhotoField";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  photo?: string | null;
  active: boolean;
  emailVerified: boolean;
  businessId: string;
  userId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TeamListProps {
  members: TeamMember[];

  onUpdateMember: (member: TeamMember) => void;

  onDeleteMember: (id: string) => void;
}

export default function TeamList({
  members,
  onUpdateMember,
  onDeleteMember,
}: TeamListProps) {
  
  // PESQUISA
  

  const [query, setQuery] = useState("");

  // MENUS
  


  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // MODAIS
  


  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);

  // LOADING
  


  const [loadingId, setLoadingId] = useState<string | null>(null);

  // CAMPOS DE EDIÇÃO
  

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSpecialty, setEditSpecialty] = useState("");
  const [editPhoto, setEditPhoto] = useState("");

  // ERRO
  


  const [error, setError] = useState("");

  // A senha nova gerada para o funcionário que está a ser editado; só existe aqui, até
  // fechar a janela.
  const [newPassword, setNewPassword] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState(false);

  // FILTRAR
  


  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return members;
    }

    return members.filter((member) => {
      return (
        member.name.toLowerCase().includes(normalized) ||
        member.email.toLowerCase().includes(normalized) ||
        member.phone.toLowerCase().includes(normalized) ||
        member.specialty.toLowerCase().includes(normalized)
      );
    });
  }, [members, query]);

  // ABRIR EDIÇÃO
  


  function openEdit(member: TeamMember) {
    setEditingMember(member);

    setEditName(member.name);
    setEditEmail(member.email);
    setEditPhone(member.phone);
    setEditSpecialty(member.specialty);
    setEditPhoto(member.photo ?? "");

    setOpenMenu(null);
    setError("");
  }

  // FECHAR EDIÇÃO
  


  async function generatePassword() {
    if (!editingMember) return;

    try {
      setGeneratingPassword(true);

      const response = await fetch(`/api/professionals/${editingMember.id}/password`, { method: "POST" });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.temporaryPassword) {
        throw new Error(data?.error || "Não foi possível gerar uma nova senha.");
      }

      setNewPassword(data.temporaryPassword);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível gerar uma nova senha.");
    } finally {
      setGeneratingPassword(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success("Senha copiada.");
    } catch {
      toast.error("Não foi possível copiar a senha.");
    }
  }

  function closeEdit() {
    if (loadingId === editingMember?.id) {
      return;
    }

    setEditingMember(null);
    setNewPassword("");

    setEditName("");
    setEditEmail("");
    setEditPhone("");
    setEditSpecialty("");


    setError("");
  }

  // EDITAR
  


  async function handleEdit() {
    if (!editingMember) return;

    setError("");

    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();
    const phone = editPhone.trim();
    const specialty = editSpecialty.trim();

    // VALIDAR NOME
  


    if (!name) {
      setError("Digite o nome.");
      return;
    }

    // VALIDAR EMAIL
  


    if (!email) {
      setError("Digite o email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError("Digite um email válido.");
      return;
    }

    // VALIDAR TELEFONE
  


    if (!phone) {
      setError("Digite o telefone.");
      return;
    }

    // VALIDAR ESPECIALIDADE
  


    if (!specialty) {
      setError("Digite a especialidade.");
      return;
    }

    try {
      setLoadingId(editingMember.id);

      // ENVIAR PARA API
  


      const response = await fetch(`/api/professionals/${editingMember.id}`, {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name,
          email,
          phone,
          specialty,
          photo: editPhoto,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível editar o profissional.",
        );
      }

      // A API retorna:
      //
      // {
      //   success: true,
      //   professional: {...}
      // }
  


      const professional = data?.professional;

      if (!professional) {
        throw new Error("A API não retornou os dados atualizados.");
      }

      // ATUALIZAR LISTA
  


      const updatedMember: TeamMember = {
        ...editingMember,

        id: String(professional.id ?? editingMember.id),

        name: String(professional.name ?? name),

        email: String(professional.email ?? email),

        phone: String(professional.phone ?? phone),

        specialty: String(professional.specialty ?? specialty),

        photo: typeof professional.photo === "string" ? professional.photo : editPhoto || null,

        active: professional.active === true,

        emailVerified: professional.emailVerified === true,

        businessId: String(professional.businessId ?? editingMember.businessId),

        userId: professional.userId ?? editingMember.userId ?? null,

        createdAt: String(professional.createdAt ?? editingMember.createdAt),

        updatedAt: String(professional.updatedAt ?? editingMember.updatedAt),
      };

      onUpdateMember(updatedMember);

      // MENSAGEM
  


      toast.success("Profissional atualizado com sucesso.");

      closeEdit();
    } catch (error) {
      console.error("Erro ao editar profissional:", error);

      setError(
        error instanceof Error ? error.message : "Erro ao editar profissional.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  // ATIVAR / DESATIVAR
  //
  // A API também altera User.active.
  //
  // Profissional:
  // active = false
  //
  // Conta:
  // active = false
  //
  // Portanto o EMPLOYEE não consegue entrar.
  

  async function handleToggleActive(member: TeamMember) {
    try {
      setLoadingId(member.id);
      setOpenMenu(null);

      const newActive = !member.active;

      const response = await fetch(`/api/professionals/${member.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          active: newActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível alterar o estado.");
      }

      // ATUALIZAR LISTA
  


      const updatedProfessional = data?.professional;

      onUpdateMember({
        ...member,

        ...(updatedProfessional ?? {}),

        active: newActive,
      });

      // MENSAGEM
  


      if (newActive) {
        toast.success(
          `${member.name} foi ativado e a conta de acesso também foi ativada.`,
        );
      } else {
        toast.success(
          `${member.name} foi desativado e a conta de acesso também foi desativada.`,
        );
      }
    } catch (error) {
      console.error("Erro ao alterar estado:", error);

      toast.error(
        error instanceof Error ? error.message : "Erro ao alterar estado.",
      );
    } finally {
      setLoadingId(null);
    }
  }

  // EXCLUIR
  


  async function handleDelete() {
    if (!deletingMember) return;

    try {
      setLoadingId(deletingMember.id);

      const response = await fetch(`/api/professionals/${deletingMember.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        // POSSUI AGENDAMENTOS
  


        if (data?.reason === "has_appointments") {
          setDeletingMember(null);
          setOpenMenu(null);

          toast.error(
            data.error ||
              "Este profissional possui agendamentos. Desative-o em vez de excluir.",
            {
              duration: 10000,
            },
          );

          return;
        }

        throw new Error(data?.error || "Não foi possível excluir.");
      }

      // REMOVER DA LISTA
  


      onDeleteMember(deletingMember.id);

      setDeletingMember(null);
      setOpenMenu(null);

      toast.success(
        `${deletingMember.name} e a conta de acesso foram excluídos.`,
      );
    } catch (error) {
      console.error("Erro ao excluir profissional:", error);

      toast.error(error instanceof Error ? error.message : "Erro ao excluir.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <>
      {/*LISTA */}

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/*HEADER */}

        <div className="flex flex-col gap-4 border-b border-gray-100 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Profissionais</h2>

            <p className="mt-1 text-sm text-gray-500">
              Profissionais cadastrados.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pesquisar profissional..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        {/*PROFISSIONAIS */}

        <div className="divide-y divide-gray-100">
          {filteredMembers.length === 0 ? (
            <div className="p-10 text-center">
              <p className="font-medium text-gray-700">
                Nenhum profissional encontrado.
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Adicione um profissional ou tente outra pesquisa.
              </p>
            </div>
          ) : (
            filteredMembers.map((member) => {
              const isLoading = loadingId === member.id;

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 p-5 transition hover:bg-gray-50 md:flex-row md:items-center md:justify-between"
                >
                  {/*AÇÕES */}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      {member.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.photo}
                          alt=""
                          className="h-10 w-10 rounded-full border border-gray-200 object-cover"
                        />
                      ) : null}

                      <h3 className="font-semibold text-gray-950">
                        {member.name}
                      </h3>

                      {/* ESTADO */}

                      {member.active ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          Ativo
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                          Inativo
                        </span>
                      )}

                      {/* EMAIL */}

                      {member.email &&
                        (member.emailVerified ? (
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            Email verificado
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Email não verificado
                          </span>
                        ))}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      {member.email && <span>{member.email}</span>}

                      {member.phone && <span>{member.phone}</span>}

                      {member.specialty && <span>{member.specialty}</span>}
                    </div>
                  </div>

                  {/* ==================================================
                      MENU
                  {/*MENU */} 

                  <div className="relative shrink-0">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() =>
                        setOpenMenu(openMenu === member.id ? null : member.id)
                      }
                      aria-label="Abrir ações"
                      className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
                    >
                      <MoreHorizontal size={24} />
                    </button>

                    {openMenu === member.id && (
                      <div className="absolute right-0 top-11 z-50 w-48 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                        {/* EDITAR */}

                        <button
                          type="button"
                          onClick={() => openEdit(member)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Pencil size={18} />
                          Editar
                        </button>

                        {/* ATIVAR / DESATIVAR */}

                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleToggleActive(member)}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <Power size={18} />

                          {member.active ? "Desativar" : "Ativar"}
                        </button>

                        {/* EXCLUIR */}

                        <button
                          type="button"
                          onClick={() => {
                            setDeletingMember(member);

                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 size={18} />
                          Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

        {/*MODAL EDITAR */}

      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/*HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 className="text-xl font-bold text-gray-950">
                  Editar profissional
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Atualize os dados ou defina uma nova palavra-passe.
                </p>
              </div>

              <button
                type="button"
                disabled={loadingId === editingMember.id}
                onClick={closeEdit}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X size={22} />
              </button>
            </div>

            {/*CAMPOS */}

            <div className="max-h-[70vh] space-y-5 overflow-y-auto p-6">
              {/* ERRO */}

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {/*NOME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Nome
                </label>

                <input
                  type="text"
                  value={editName}
                  disabled={loadingId === editingMember.id}
                  onChange={(event) => setEditName(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/*EMAIL */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Email
                </label>

                <input
                  type="email"
                  value={editEmail}
                  disabled={loadingId === editingMember.id}
                  onChange={(event) => setEditEmail(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                />

                <p className="mt-1.5 text-xs text-gray-500">
                  Se alterar o email, será necessário verificá-lo novamente.
                </p>
              </div>

              {/*TELEFONE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Telefone
                </label>

                <input
                  type="tel"
                  value={editPhone}
                  disabled={loadingId === editingMember.id}
                  onChange={(event) => setEditPhone(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/*ESPECIALIDADE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Especialidade
                </label>

                <input
                  type="text"
                  value={editSpecialty}
                  disabled={loadingId === editingMember.id}
                  onChange={(event) => setEditSpecialty(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                />
              </div>

              {/* FOTO */}

              <PhotoField
                value={editPhoto}
                onChange={setEditPhoto}
                disabled={loadingId === editingMember.id}
                allowRemove={!editingMember.photo}
              />

              {/* SENHA */}

              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                  <KeyRound size={20} className="text-gray-600" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Palavra-passe
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Por segurança, a senha em uso nunca é mostrada. Se o
                    funcionário a perdeu, gere uma nova e entregue-lha; a
                    anterior deixa de funcionar.
                  </p>

                  {newPassword ? (
                    <div className="mt-3 flex items-center gap-2">
                      <code className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900">
                        {newPassword}
                      </code>

                      <button
                        type="button"
                        onClick={copyPassword}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        Copiar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={generatePassword}
                      disabled={generatingPassword}
                      className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      {generatingPassword ? "A gerar..." : "Gerar nova senha"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* BOTÕES */}

            <div className="flex justify-end gap-3 border-t border-gray-100 p-6">
              <button
                type="button"
                disabled={loadingId === editingMember.id}
                onClick={closeEdit}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleEdit}
                disabled={loadingId === editingMember.id}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={18} />

                {loadingId === editingMember.id
                  ? "A guardar..."
                  : "Guardar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR */}

      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {/* ÍCONE */}

            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={24} className="text-red-600" />
            </div>

            {/* TÍTULO */}

            <h2 className="mt-5 text-xl font-bold text-gray-950">
              Excluir profissional?
            </h2>

            {/* TEXTO */}

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Tem certeza que deseja excluir{" "}
              <strong className="text-gray-800">{deletingMember.name}</strong>?
            </p>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-xs leading-5 text-amber-800">
                A conta de acesso
                <strong> EMPLOYEE</strong> vinculada também será excluída.
              </p>
            </div>

            {/* BOTÕES */}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={loadingId === deletingMember.id}
                onClick={() => setDeletingMember(null)}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loadingId === deletingMember.id}
                className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingId === deletingMember.id
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
