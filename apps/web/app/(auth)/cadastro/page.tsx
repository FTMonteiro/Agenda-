"use client";

import { FormEvent, useEffect, useState } from "react";

import Link from "next/link";
import { BUSINESS_CATEGORIES, BUSINESS_CATEGORY_DESCRIPTIONS } from "@slotix/types";
import { Check } from "lucide-react";
import { AuthHeader, AuthShell } from "@/components/auth/AuthShell";
import { AuthButton, Divider, FormAlert, GoogleButton, PasswordField, TextField } from "@/components/auth/fields";
import { categoryImage } from "@/lib/category-images";

type RegisterResponse = {
  success?: boolean;
  message?: string;
  redirectTo?: string;
  error?: string;
  code?: string;
};

export default function CadastroPage() {
  const [name, setName] = useState("");

  const [company, setCompany] = useState("");

  const [category, setCategory] = useState("");

  // O tipo de espaço é perguntado num ecrã próprio, depois dos dados da conta. `via`
  // lembra por onde a pessoa veio, para o botão final criar a conta da mesma forma.
  const [step, setStep] = useState<"form" | "category">("form");

  const [via, setVia] = useState<"email" | "google">("email");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [confirmPassword, setConfirmPassword] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  /*ERROS DO CALLBACK GOOGLE
   */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const error = params.get("error");

    if (!error) {
      return;
    }

    switch (error) {
      case "account_exists":

      case "email_already_registered":

      case "google_already_registered":
        setErrorMessage(
          "Esta conta já está cadastrada. Entre na sua conta ou utilize outro email.",
        );
        break;

      case "google_not_registered":
        setErrorMessage(
          "Esta conta Google ainda não está cadastrada. Crie uma conta primeiro.",
        );
        break;

      case "google":
      case "google_auth_failed":
        setErrorMessage("Não foi possível concluir o cadastro com Google.");
        break;

      case "google_config":
        setErrorMessage(
          "O cadastro com Google ainda não está configurado corretamente no servidor.",
        );
        break;

      case "google_cancelled":
        setErrorMessage("O cadastro com Google foi cancelado.");
        break;

      case "google_invalid_state":
        setErrorMessage(
          "A sessão de segurança do Google expirou. Tente novamente.",
        );
        break;

      case "google_email_not_verified":
        setErrorMessage("O Google não confirmou o email desta conta.");
        break;

      case "google_code_missing":
        setErrorMessage("O Google não devolveu o código de autenticação.");
        break;

      case "company_required":
        setErrorMessage(
          "Digite o nome do espaço antes de continuar com o Google.",
        );
        break;

      case "company_invalid":
        setErrorMessage("O nome do espaço informado não é válido.");
        break;

      case "category_required":
        setErrorMessage(
          "Escolha o tipo do seu espaço antes de continuar com o Google.",
        );
        break;

      case "company_too_long":
        setErrorMessage("O nome do espaço é demasiado longo.");
        break;

      default:
        setErrorMessage("Não foi possível concluir o cadastro.");
        break;
    }

    /* LIMPAR QUERY STRING*/

    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  /*
 CADASTRO NORMAL
  
  */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading || googleLoading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedName = name.trim();

    const normalizedCompany = company.trim();

    const normalizedEmail = email.trim().toLowerCase();

    /*
    CAMPOS
    */

    if (
      !normalizedName ||
      !normalizedCompany ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage("Preencha todos os campos obrigatórios.");

      return;
    }

    /* TERMOS*/

    if (!acceptedTerms) {
      setErrorMessage(
        "É necessário aceitar os Termos de utilização e a Política de privacidade.",
      );

      return;
    }

    /* PASSWORD*/

    if (password.length < 8) {
      setErrorMessage("A palavra-passe deve ter pelo menos 8 caracteres.");

      return;
    }

    /* CONFIRMAR PASSWORD*/

    // nosemgrep: ajinabraham.njsscan.crypto.timing_attack_node.node_timing_attack -- confirmação da password no browser, não comparação de um segredo do servidor.
    if (password !== confirmPassword) {
      setErrorMessage("As palavras-passe não coincidem.");

      return;
    }

    /* PASSO SEGUINTE: TIPO DE ESPAÇO */

    setVia("email");
    setStep("category");
  }

  /*
 CRIAR A CONTA (depois de escolhido o tipo de espaço)
  */

  async function createAccount() {
    if (loading || googleLoading || !category) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const normalizedName = name.trim();

    const normalizedCompany = company.trim();

    const normalizedEmail = email.trim().toLowerCase();

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          name: normalizedName,

          company: normalizedCompany,

          category,

          email: normalizedEmail,

          password,
        }),
      });

      let data: RegisterResponse | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      /* CONTA EXISTE*/

      const duplicateAccount =
        response.status === 409 ||
        data?.code === "ACCOUNT_EXISTS" ||
        data?.code === "EMAIL_ALREADY_REGISTERED" ||
        data?.error === "ACCOUNT_EXISTS" ||
        data?.error === "EMAIL_ALREADY_REGISTERED";

      if (duplicateAccount) {
        setErrorMessage(
          "Esta conta já está cadastrada. Entre na sua conta ou utilize outro email.",
        );

        setLoading(false);

        // O email corrige-se no primeiro passo.
        setStep("form");

        return;
      }

      /*OUTROS ERROS*/

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Não foi possível criar a conta.",
        );
      }

      /*
       SUCESSO
      */

      setSuccessMessage(
        "Conta criada com sucesso! Redirecionando para o login...",
      );

      const redirectTo = data?.redirectTo || "/login";

      window.setTimeout(() => {
        window.location.replace(redirectTo);
      }, 1000);
    } catch (error) {
      console.error("Erro ao criar conta:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta.",
      );

      setLoading(false);
    }
  }

  /*CADASTRO GOOGLE*/

  function handleGoogleRegister() {
    if (loading || googleLoading) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    /*EMPRESA OBRIGATÓRIA  */

    const normalizedCompany = company.trim();

    if (!normalizedCompany) {
      setErrorMessage(
        "Digite o nome do espaço antes de continuar com o Google.",
      );

      return;
    }

    if (normalizedCompany.length < 2) {
      setErrorMessage("O nome do espaço deve ter pelo menos 2 caracteres.");

      return;
    }

    if (normalizedCompany.length > 120) {
      setErrorMessage("O nome do espaço é demasiado longo.");

      return;
    }

    /* PASSO SEGUINTE: TIPO DE ESPAÇO */

    setVia("google");
    setStep("category");
  }

  function continueWithGoogle() {
    if (loading || googleLoading || !category) {
      return;
    }

    setErrorMessage("");

    setGoogleLoading(true);

    /*ENVIAR EMPRESA E TIPO DE ESPAÇO PARA O BACKEND*/

    const normalizedCompany = company.trim();

    const googleUrl = `/api/auth/google?mode=register&company=${encodeURIComponent(
      normalizedCompany,
    )}&category=${encodeURIComponent(category)}`;

    window.location.href = googleUrl;
  }

  const busy = loading || googleLoading;

  const clearError = () => setErrorMessage("");

  return (
    <AuthShell wide={step === "category"}>
      {step === "form" ? (
        <AuthHeader
          eyebrow="Passo 1 de 2"
          title="Criar conta"
          description="Comece com os seus dados e os do seu espaço."
        />
      ) : (
        <AuthHeader
          eyebrow="Passo 2 de 2"
          title="Que tipo de espaço é?"
          description={`É a categoria em que ${company.trim() || "o seu espaço"} vai aparecer na app. Pode mudá-la depois em Configurações.`}
        />
      )}

      {successMessage && <FormAlert tone="success">{successMessage}</FormAlert>}

      {errorMessage && (
        <FormAlert>
          {errorMessage}
          {errorMessage.includes("já está cadastrada") && (
            <Link href="/login" className="mt-1 block font-semibold underline underline-offset-2">
              Entrar na minha conta
            </Link>
          )}
        </FormAlert>
      )}

      {step === "form" && (
        <>
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <TextField
              id="name"
              label="Nome completo"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                clearError();
              }}
              autoComplete="name"
              autoFocus
              disabled={busy}
            />

            <TextField
              id="company"
              label="Nome do espaço"
              value={company}
              onChange={(event) => {
                setCompany(event.target.value);
                clearError();
              }}
              placeholder="Ex.: Barbearia Central"
              autoComplete="organization"
              disabled={busy}
            />

            <TextField
              id="email"
              label="Email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                clearError();
              }}
              placeholder="nome@exemplo.com"
              autoComplete="email"
              inputMode="email"
              disabled={busy}
            />

            <PasswordField
              id="password"
              label="Palavra-passe"
              hint="Pelo menos 8 caracteres."
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                clearError();
              }}
              autoComplete="new-password"
              disabled={busy}
            />

            <PasswordField
              id="confirmPassword"
              label="Confirmar palavra-passe"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearError();
              }}
              autoComplete="new-password"
              disabled={busy}
            />

            <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-[var(--muted)]">
              <input
                id="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  clearError();
                }}
                disabled={busy}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--brand)]"
              />
              <span>
                Concordo com os{" "}
                <Link href="/termos" className="font-medium text-[var(--foreground)] underline underline-offset-2">
                  Termos de utilização
                </Link>{" "}
                e a{" "}
                <Link href="/termos/privacidade" className="font-medium text-[var(--foreground)] underline underline-offset-2">
                  Política de privacidade
                </Link>
                .
              </span>
            </label>

            <AuthButton type="submit" disabled={busy} className="w-full">
              Continuar
            </AuthButton>
          </form>

          <Divider />

          <GoogleButton onClick={handleGoogleRegister} disabled={busy}>
            Continuar com Google
          </GoogleButton>
          <p className="mt-2 text-[13px] text-[var(--subtle)]">Indique antes o nome do espaço.</p>

          <p className="mt-8 text-sm text-[var(--muted)]">
            Já tem uma conta?{" "}
            <Link href="/login" className="font-medium text-[var(--brand-text)] underline-offset-4 hover:underline">
              Entrar
            </Link>
          </p>
        </>
      )}

      {step === "category" && (
        <>
          <div role="radiogroup" aria-label="Tipo de espaço" className="grid gap-2.5 sm:grid-cols-2">
            {BUSINESS_CATEGORIES.map((option) => {
              const selected = category === option;

              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={busy}
                  onClick={() => {
                    setCategory(option);
                    clearError();
                  }}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed ${
                    selected
                      ? "border-primary bg-primary/[0.06] ring-1 ring-primary"
                      : "border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-secondary)]"
                  }`}
                >
                  <img src={categoryImage(option)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{option}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-[var(--muted)]">
                      {BUSINESS_CATEGORY_DESCRIPTIONS[option]}
                    </span>
                  </span>

                  <span
                    aria-hidden="true"
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      selected ? "border-primary bg-primary text-white" : "border-[var(--border-strong)] text-transparent"
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <AuthButton
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setStep("form");
                clearError();
              }}
            >
              Voltar
            </AuthButton>

            <AuthButton
              type="button"
              loading={busy}
              disabled={!category}
              onClick={via === "google" ? continueWithGoogle : createAccount}
              className="flex-1"
            >
              {googleLoading ? "A ligar ao Google..." : loading ? "A criar conta..." : via === "google" ? "Continuar com Google" : "Criar conta"}
            </AuthButton>
          </div>
        </>
      )}
    </AuthShell>
  );
}
