"use client";

import { useState } from "react";
import {
  Plus,
  X,
  UserPlus,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  Check,
} from "lucide-react";
import { PageActions, brandButton } from "@/components/ui/PageActions";

import { useCategoryExamples } from "@/lib/category-examples";
import type { TeamMember } from "./TeamList";
import { PhotoField } from "./PhotoField";

interface TeamHeaderProps {
  onMemberCreated: (member: TeamMember) => void;
}

export default function TeamHeader({ onMemberCreated }: TeamHeaderProps) {
  const [open, setOpen] = useState(false);
  const examples = useCategoryExamples();

  
  // DADOS DO PROFISSIONAL
  

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [photo, setPhoto] = useState("");

  
  // CREDENCIAIS CRIADAS
  //
  // Estas informações existem somente na memória do frontend
  // depois que o cadastro é concluído.
  

  const [createdEmail, setCreatedEmail] = useState("");

  const [createdPassword, setCreatedPassword] = useState("");

  const [showCreatedPassword, setShowCreatedPassword] = useState(true);

  const [passwordCopied, setPasswordCopied] = useState(false);

  
  // ESTADOS


  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  
  // RESET


  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setSpecialty("");
    setPhoto("");




    setCreatedEmail("");
    setCreatedPassword("");

    setShowCreatedPassword(true);
    setPasswordCopied(false);

    setError("");
    setSuccess("");
  }


  // FECHAR MODAL


  function closeModal() {
    if (loading) return;

    setOpen(false);
    resetForm();
  }

  
  // COPIAR SENHA


  async function copyCreatedPassword() {
    if (!createdPassword) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdPassword);

      setPasswordCopied(true);

      setTimeout(() => {
        setPasswordCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Erro ao copiar senha:", error);

      setError("Não foi possível copiar a senha.");
    }
  }


  // SUBMIT
  

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreatedEmail("");
    setCreatedPassword("");
    setPasswordCopied(false);

    const cleanName = name.trim();

    const cleanEmail = email.trim().toLowerCase();

    const cleanPhone = phone.trim();

    const cleanSpecialty = specialty.trim();

    
    // VALIDAR NOME
  

    if (!cleanName) {
      setError("Digite o nome do profissional.");
      return;
    }

    // VALIDAR EMAIL
    


    if (!cleanEmail) {
      setError("Digite o email do profissional.");
      return;
    }

    // VALIDAR TELEFONE
    


    if (!cleanPhone) {
      setError("Digite o telefone do profissional.");
      return;
    }

    
    // VALIDAR ESPECIALIDADE
    


    if (!cleanSpecialty) {
      setError("Digite a especialidade do profissional.");
      return;
    }

    // VALIDAR EMAIL
    


    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      setError("Digite um email válido.");
      return;
    }

    // ENVIAR PARA API
    


    try {
      setLoading(true);

      const response = await fetch("/api/professionals", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: cleanName,

          email: cleanEmail,

          phone: cleanPhone,

          specialty: cleanSpecialty,

          photo,
        }),
      });

      const data = await response.json();

      // ERRO DA API
    


      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível cadastrar o profissional.",
        );
      }

      // PROFISSIONAL CRIADO
    


      const professional = data?.professional;

      if (!professional) {
        throw new Error("A API não retornou os dados do profissional.");
      }

      // NORMALIZAR PROFISSIONAL
    


      const member: TeamMember = {
        id: String(professional.id ?? ""),

        name: String(professional.name ?? ""),

        email: String(professional.email ?? ""),

        phone: String(professional.phone ?? ""),

        specialty: String(professional.specialty ?? ""),

        photo: typeof professional.photo === "string" ? professional.photo : null,

        active: professional.active === true,

        emailVerified: professional.emailVerified === true,

        businessId: String(professional.businessId ?? ""),

        createdAt: String(professional.createdAt ?? ""),

        updatedAt: String(professional.updatedAt ?? ""),
      };

      // ATUALIZAR LISTA
    


      onMemberCreated(member);

      // VERIFICAR SE O ACESSO FOI CRIADO
    


      const temporaryPassword =
        typeof data?.temporaryPassword === "string"
          ? data.temporaryPassword
          : "";

      // ACESSO CRIADO
    


      if (data?.accessCreated === true && temporaryPassword) {
        // Guardar somente no estado do frontend.

        setCreatedEmail(cleanEmail);

        setCreatedPassword(temporaryPassword);

        setShowCreatedPassword(true);

        setPasswordCopied(false);

        setSuccess("Funcionário cadastrado com sucesso.");

        // LIMPAR FORMULÁRIO
        //
        // Não limpamos as credenciais criadas.
        // Elas precisam continuar visíveis.
    


        setName("");
        setEmail("");
        setPhone("");
        setSpecialty("");




        // IMPORTANTE:
        // Não fechar o modal.
        return;
      }

      // CADASTRO SEM ACESSO
    


      setSuccess(data?.message || "Profissional cadastrado com sucesso.");

      setName("");
      setEmail("");
      setPhone("");
      setSpecialty("");



      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (error) {
      console.error("Erro ao cadastrar profissional:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Erro ao cadastrar profissional.",
      );
    } finally {
      setLoading(false);
    }
  }

  // RENDER
    


  return (
    <>
      {/* 
          HEADER
       */}

      <PageActions>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setOpen(true);
            }}
            className={brandButton}
          >
            <Plus size={18} />
            Novo profissional
          </button>
      </PageActions>

      {/* 
          MODAL
       */}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-lg rounded-3xl bg-white shadow-2xl">
            {/* 
                HEADER DO MODAL
             */}

            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50">
                  {createdPassword ? (
                    <KeyRound size={21} className="text-blue-600" />
                  ) : (
                    <UserPlus size={21} className="text-blue-600" />
                  )}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-950">
                    {createdPassword
                      ? "Funcionário cadastrado"
                      : "Novo profissional"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {createdPassword
                      ? "As credenciais de acesso estão prontas."
                      : "Preencha todos os campos."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={closeModal}
                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* 
                FORMULÁRIO
             */}

            {!createdPassword && (
              <form onSubmit={handleSubmit} className="space-y-5 p-6">
                {/* ERRO */}

                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}

                {/* SUCESSO */}

                {success && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                    {success}
                  </div>
                )}

                {/* 
                    NOME
                 */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Nome
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nome completo"
                    disabled={loading}
                    autoComplete="name"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* 
                    EMAIL
                 */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="profissional@email.com"
                    disabled={loading}
                    autoComplete="email"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* 
                    TELEFONE
                 */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Telefone
                  </label>

                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="+244 9XX XXX XXX"
                    disabled={loading}
                    autoComplete="tel"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* 
                    ESPECIALIDADE
                 */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Especialidade
                  </label>

                  <input
                    type="text"
                    value={specialty}
                    onChange={(event) => setSpecialty(event.target.value)}
                    placeholder={examples.specialty}
                    disabled={loading}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-blue-500 disabled:bg-gray-100"
                  />
                </div>

                {/* FOTO */}

                <PhotoField value={photo} onChange={setPhoto} disabled={loading} />

                {/* ACESSO AO SISTEMA */}

                <div className="flex items-start gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white">
                    <KeyRound size={18} className="text-gray-600" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      Acesso ao sistema
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      A senha é gerada automaticamente e mostrada depois de
                      cadastrar, para entregar ao funcionário. Ele pode
                      alterá-la na própria conta.
                    </p>
                  </div>
                </div>

                {/* 
                    BOTÕES
                 */}

                <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={closeModal}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? "A cadastrar..." : "Cadastrar profissional"}
                  </button>
                </div>
              </form>
            )}

            {/* 
                TELA DE CREDENCIAIS
             */}

            {createdPassword && (
              <div className="p-6">
                {/* SUCESSO */}

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Check size={20} className="text-emerald-600" />
                    </div>

                    <div>
                      <h3 className="font-bold text-emerald-900">
                        Funcionário cadastrado com sucesso!
                      </h3>

                      <p className="mt-1 text-sm leading-5 text-emerald-700">
                        A conta foi criada com o perfil de funcionário.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 
                    CREDENCIAIS
                 */}

                <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                      Credenciais de acesso
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Entregue estas informações ao funcionário.
                    </p>
                  </div>

                  {/* EMAIL */}

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-500">
                      EMAIL
                    </label>

                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900">
                      {createdEmail}
                    </div>
                  </div>

                  {/* SENHA */}

                  <div className="mt-4">
                    <label className="mb-2 block text-xs font-semibold text-gray-500">
                      PALAVRA-PASSE INICIAL
                    </label>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showCreatedPassword ? "text" : "password"}
                          value={createdPassword}
                          readOnly
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 font-mono text-sm font-semibold text-gray-900 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowCreatedPassword((current) => !current)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                          aria-label={
                            showCreatedPassword
                              ? "Ocultar senha"
                              : "Mostrar senha"
                          }
                        >
                          {showCreatedPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>

                      {/* COPIAR */}

                      <button
                        type="button"
                        onClick={copyCreatedPassword}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        {passwordCopied ? (
                          <>
                            <Check size={17} className="text-emerald-600" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy size={17} />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 
                    AVISO
                 */}

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs leading-5 text-amber-800">
                    <strong>Importante:</strong> esta é a palavra-passe definida
                    para este funcionário. Guarde-a ou entregue-a ao funcionário
                    agora. Por segurança, ela não será mostrada novamente depois
                    que fechar esta janela.
                  </p>
                </div>

                {/* 
                    CONCLUIR
                 */}

                <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
                  >
                    Concluir
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
