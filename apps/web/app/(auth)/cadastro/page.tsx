"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

import Link from "next/link";
import {
  BUSINESS_CATEGORIES,
  BUSINESS_CATEGORY_DESCRIPTIONS,
  type BusinessCategory,
} from "@slotix/types";
import { BrandLogo } from "@/components/brand/BrandLogo";

import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Flower2,
  Hand,
  Leaf,
  Loader2,
  Lock,
  type LucideIcon,
  Mail,
  Paintbrush,
  Palette,
  PawPrint,
  PenTool,
  Ribbon,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
  Waves,
} from "lucide-react";
import { categoryImage } from "@/lib/category-images";

const CATEGORY_ICONS: Record<BusinessCategory, LucideIcon> = {
  Barbearia: Scissors,
  Salão: Sparkles,
  Nails: Paintbrush,
  SPA: Waves,
  Estética: Flower2,
  Tranças: Ribbon,
  Maquilhagem: Palette,
  "Pestanas e sobrancelhas": Eye,
  Depilação: Leaf,
  Massagens: Hand,
  "Tatuagem e piercing": PenTool,
  "Pet shop": PawPrint,
};

const inputClass =
  "h-[51px] w-full rounded-[12px] border border-neutral-200 bg-white pl-11 pr-4 text-[13px] text-neutral-900 outline-none transition-all duration-300 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/[0.06]";

const socialButtonClass =
  "group flex h-[50px] w-full items-center justify-center gap-3 rounded-[12px] border border-neutral-200 bg-white text-[13px] font-medium text-neutral-800 transition-all duration-300 hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500/10";

type RegisterResponse = {
  success?: boolean;
  message?: string;
  redirectTo?: string;
  error?: string;
  code?: string;
};

type FocusedField =
  | "name"
  | "company"
  | "email"
  | "password"
  | "confirmPassword"
  | null;

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

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [focusedField, setFocusedField] = useState<FocusedField>(null);

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

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* PAINEL ESQUERDO */}

        <section className="relative hidden min-h-screen overflow-hidden bg-[#080a0f] lg:flex">
          <div
            aria-hidden="true"
            className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px]"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]"
          />

          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.035]"
          />

          <div className="relative z-10 flex w-full flex-col px-10 py-9 xl:px-16">
            <Link
              href="/"
              className="inline-flex w-fit items-center gap-3"
              aria-label="agenda+"
            >
              <BrandLogo size={40} tagline descriptor className="text-white" plusClassName="text-[#8FFFC7]" />
            </Link>

            <div className="flex flex-1 items-center">
              <div className="max-w-[600px]">
                <p className="mb-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Comece agora
                </p>

                <h1 className="text-[48px] font-semibold leading-[0.98] tracking-[-0.055em] text-white xl:text-[68px]">
                  Crie o seu
                  <br />
                  <span className="bg-gradient-to-r from-white via-slate-100 to-blue-400 bg-clip-text text-transparent">
                    espaço no agenda+.
                  </span>
                </h1>

                <p className="mt-7 max-w-[500px] text-[15px] leading-7 text-slate-400">
                  Tenha tudo o que precisa para gerir clientes, equipa,
                  serviços, agendamentos e pagamentos num único lugar.
                </p>

                <div className="mt-10 space-y-5">
                  <Benefit
                    title="Gestão centralizada"
                    description="Organize toda a operação do seu negócio."
                  />

                  <Benefit
                    title="Agendamentos inteligentes"
                    description="Tenha controlo total sobre a sua agenda."
                  />

                  <Benefit
                    title="Cresça com dados"
                    description="Acompanhe o desempenho do seu negócio."
                  />
                </div>
              </div>
            </div>

            <p className="text-[9px] tracking-wide text-slate-700">
              © {new Date().getFullYear()} NEVRIX. Todos os direitos reservados.
            </p>
          </div>
        </section>

        {/* PAINEL DIREITO */}

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-10 sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-blue-500/[0.035] blur-[120px]"
          />

          <div
            className={`relative z-10 w-full transition-[max-width] duration-300 ${
              step === "category" ? "max-w-[560px]" : "max-w-[430px]"
            }`}
          >
            {/* LOGO MOBILE */}

            <div className="mb-10 lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3">
                <BrandLogo size={40} tagline descriptor />
              </Link>
            </div>

            {/* CABEÇALHO */}

            <div className="mb-8">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-blue-600">
                {step === "category" ? "Passo 2 de 2" : "Criar conta"}
              </p>

              <h2 className="text-[30px] font-semibold tracking-[-0.04em]">
                {step === "category"
                  ? "Que tipo de espaço é?"
                  : "Comece agora."}
              </h2>

              <p className="mt-2 text-[13px] leading-6 text-neutral-500">
                {step === "category"
                  ? `É a categoria em que ${company.trim() || "o seu espaço"} vai aparecer na app. Pode mudá-la depois em Configurações.`
                  : "Crie a sua conta para começar a utilizar o agenda+."}
              </p>

              <div className="mt-5 flex gap-1.5" aria-hidden="true">
                <span className="h-1 flex-1 rounded-full bg-blue-600" />

                <span
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    step === "category" ? "bg-blue-600" : "bg-neutral-200"
                  }`}
                />
              </div>
            </div>

            {/* SUCESSO */}

            {successMessage && (
              <div
                role="status"
                aria-live="polite"
                className="mb-5 rounded-[12px] border border-green-200 bg-green-50 px-4 py-3 text-[12px] text-green-700"
              >
                {successMessage}
              </div>
            )}

            {/* ERRO */}

            {errorMessage && (
              <div
                role="alert"
                aria-live="assertive"
                className="mb-5 rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-5 text-red-700"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                    !
                  </span>

                  <div>
                    <div>{errorMessage}</div>

                    {errorMessage.includes("já está cadastrada") && (
                      <div className="mt-2">
                        <Link
                          href="/login"
                          className="font-semibold text-red-800 underline underline-offset-2 hover:text-red-950"
                        >
                          Entrar na minha conta
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {step === "form" && (
              <>
            {/* FORMULÁRIO */}

            <form onSubmit={handleSubmit}>
              {/* NOME */}

              <Field
                id="name"
                label="Nome completo"
                icon={
                  <UserRound
                    size={16}
                    className={
                      focusedField === "name"
                        ? "text-blue-500"
                        : "text-neutral-400"
                    }
                  />
                }
              >
                <input
                  id="name"
                  type="text"
                  value={name}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  onChange={(event) => {
                    setName(event.target.value);

                    setErrorMessage("");
                  }}
                  placeholder="O seu nome completo"
                  autoComplete="name"
                  required
                  disabled={loading || googleLoading}
                  className={inputClass}
                />
              </Field>

              {/* EMPRESA */}

              <div className="mt-5">
                <Field
                  id="company"
                  label="Nome do espaço"
                  icon={
                    <Building2
                      size={16}
                      className={
                        focusedField === "company"
                          ? "text-blue-500"
                          : "text-neutral-400"
                      }
                    />
                  }
                >
                  <input
                    id="company"
                    type="text"
                    value={company}
                    onFocus={() => setFocusedField("company")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(event) => {
                      setCompany(event.target.value);

                      setErrorMessage("");
                    }}
                    placeholder="Nome do seu espaço"
                    autoComplete="organization"
                    required
                    disabled={loading || googleLoading}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* EMAIL */}

              <div className="mt-5">
                <Field
                  id="email"
                  label="Email"
                  icon={
                    <Mail
                      size={16}
                      className={
                        focusedField === "email"
                          ? "text-blue-500"
                          : "text-neutral-400"
                      }
                    />
                  }
                >
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(event) => {
                      setEmail(event.target.value);

                      setErrorMessage("");
                    }}
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                    disabled={loading || googleLoading}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* PASSWORD */}

              <div className="mt-5">
                <label
                  htmlFor="password"
                  className="mb-2 block text-[11px] font-semibold text-neutral-800"
                >
                  Palavra-passe
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(event) => {
                      setPassword(event.target.value);

                      setErrorMessage("");
                    }}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    required
                    disabled={loading || googleLoading}
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    disabled={loading || googleLoading}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={
                      showPassword
                        ? "Ocultar palavra-passe"
                        : "Mostrar palavra-passe"
                    }
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* CONFIRMAR PASSWORD */}

              <div className="mt-5">
                <label
                  htmlFor="confirmPassword"
                  className="mb-2 block text-[11px] font-semibold text-neutral-800"
                >
                  Confirmar palavra-passe
                </label>

                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onFocus={() => setFocusedField("confirmPassword")}
                    onBlur={() => setFocusedField(null)}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);

                      setErrorMessage("");
                    }}
                    placeholder="Repita a palavra-passe"
                    autoComplete="new-password"
                    required
                    disabled={loading || googleLoading}
                    className={`${inputClass} pr-12`}
                  />

                  <button
                    type="button"
                    disabled={loading || googleLoading}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar confirmação"
                        : "Mostrar confirmação"
                    }
                    className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>
                </div>
              </div>

              {/* TERMOS */}

              <div className="mt-5 flex items-start gap-3">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);

                    setErrorMessage("");
                  }}
                  required
                  disabled={loading || googleLoading}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-blue-600"
                />

                <label
                  htmlFor="terms"
                  className="text-[10px] leading-5 text-neutral-500"
                >
                  Concordo com os{" "}
                  <Link
                    href="/termos"
                    className="font-semibold text-neutral-800 hover:text-blue-600"
                  >
                    Termos de utilização
                  </Link>{" "}
                  e a{" "}
                  <Link
                    href="/termos/privacidade"
                    className="font-semibold text-neutral-800 hover:text-blue-600"
                  >
                    Política de privacidade
                  </Link>
                  .
                </label>
              </div>

              {/* BOTÃO */}

              <button
                type="submit"
                disabled={
                  loading ||
                  googleLoading ||
                  !name.trim() ||
                  !company.trim() ||
                  !email.trim() ||
                  !password ||
                  !confirmPassword ||
                  !acceptedTerms
                }
                className="group relative mt-6 flex h-[51px] w-full items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-[#080a0f] text-[13px] font-semibold text-white shadow-[0_8px_25px_rgba(0,0,0,0.12)] transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Criar conta
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>
            </form>

            {/* DIVISOR */}

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />

              <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                ou continuar com
              </span>

              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            {/* GOOGLE */}

            <button
              type="button"
              onClick={handleGoogleRegister}
              disabled={googleLoading || loading}
              className={socialButtonClass}
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}

              <span>
                {googleLoading
                  ? "A ligar ao Google..."
                  : "Continuar com Google"}
              </span>
            </button>

            {/* LOGIN */}

            <p className="mt-7 text-center text-[13px] text-neutral-500">
              Já tem uma conta?{" "}
              <Link
                href="/login"
                className="font-semibold text-neutral-950 hover:text-blue-600"
              >
                Entrar
              </Link>
            </p>
              </>
            )}

            {/* PASSO 2: TIPO DE ESPAÇO */}

            {step === "category" && (
              <div>
                <div
                  role="radiogroup"
                  aria-label="Tipo de espaço"
                  className="grid gap-3 sm:grid-cols-2"
                >
                  {BUSINESS_CATEGORIES.map((option) => {
                    const selected = category === option;

                    return (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={loading || googleLoading}
                        onClick={() => {
                          setCategory(option);

                          setErrorMessage("");
                        }}
                        style={{ animationDelay: `${BUSINESS_CATEGORIES.indexOf(option) * 45}ms` }}
                        className={`fade-up group relative flex items-center gap-3 rounded-[14px] border p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/15 active:scale-[0.99] disabled:cursor-not-allowed ${
                          selected
                            ? "border-blue-600 bg-blue-50/60 shadow-[0_8px_25px_rgba(37,99,235,0.10)]"
                            : "border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)]"
                        }`}
                      >
                        <img
                          src={categoryImage(option)}
                          alt=""
                          className={`h-12 w-12 shrink-0 rounded-[11px] object-cover transition-transform duration-300 group-hover:scale-110 ${
                            selected ? "ring-2 ring-blue-600" : ""
                          }`}
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-neutral-900">
                            {option}
                          </span>

                          <span className="mt-0.5 block text-[11px] leading-4 text-neutral-500">
                            {BUSINESS_CATEGORY_DESCRIPTIONS[option]}
                          </span>
                        </span>

                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ${
                            selected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-neutral-300 text-transparent"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    disabled={loading || googleLoading}
                    onClick={() => {
                      setStep("form");

                      setErrorMessage("");
                    }}
                    className="flex h-[51px] items-center justify-center gap-2 rounded-[12px] border border-neutral-200 bg-white px-5 text-[13px] font-medium text-neutral-800 transition-all hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ArrowLeft size={16} />
                    Voltar
                  </button>

                  <button
                    type="button"
                    disabled={!category || loading || googleLoading}
                    onClick={via === "google" ? continueWithGoogle : createAccount}
                    className="group flex h-[51px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#080a0f] text-[13px] font-semibold text-white shadow-[0_8px_25px_rgba(0,0,0,0.12)] transition-all hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading || googleLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {googleLoading
                          ? "A ligar ao Google..."
                          : "Criando conta..."}
                      </>
                    ) : (
                      <>
                        {via === "google"
                          ? "Continuar com Google"
                          : "Concluir"}
                        <ArrowRight
                          size={16}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SEGURANÇA */}

            <div className="mt-5 flex items-center justify-center gap-2 text-[9px] text-neutral-400">
              <ShieldCheck size={11} />

              <span>Os seus dados permanecem protegidos.</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/*
 FIELD
*/

function Field({
  id,
  label,
  icon,
  children,
}: {
  id: string;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-[11px] font-semibold text-neutral-800"
      >
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2">
          {icon}
        </div>

        {children}
      </div>
    </div>
  );
}

/*
BENEFIT
*/

function Benefit({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
        ✓
      </div>

      <div>
        <p className="text-[11px] font-semibold text-slate-200">{title}</p>

        <p className="mt-1 text-[10px] leading-5 text-slate-600">
          {description}
        </p>
      </div>
    </div>
  );
}

/*
 GOOGLE ICON

*/

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.7-.06-1.38-.18-2.03H12v3.84h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.2Z"
      />

      <path
        fill="#34A853"
        d="M12 21.82c2.63 0 4.84-.87 6.45-2.39l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.75 9.75 0 0 0 12 21.82Z"
      />

      <path
        fill="#FBBC05"
        d="M6.54 13.87A5.86 5.86 0 0 1 6.23 12c0-.65.11-1.28.31-1.87V7.6H3.3A9.83 9.83 0 0 0 2.25 12c0 1.58.38 3.08 1.05 4.4l3.24-2.53Z"
      />

      <path
        fill="#EA4335"
        d="M12 6.1c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.16 14.63 2.18 12 2.18A9.75 9.75 0 0 0 3.3 7.6l3.24 2.53C7.31 7.82 9.46 6.1 12 6.1Z"
      />
    </svg>
  );
}
