"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Users,
  Loader2,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  /*
  | LER ERROS VINDOS DO GOOGLE

  */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const googleError = params.get("error");

    if (googleError === "google_not_registered") {
      setError(
        "Esta conta Google ainda não está cadastrada no agenda+. Crie uma conta primeiro.",
      );
    }

    if (googleError === "google") {
      setError("Não foi possível entrar com o Google. Tente novamente.");
    }

    if (googleError === "google_config") {
      setError(
        "O login com Google ainda não está configurado corretamente no servidor.",
      );
    }

    if (googleError === "google_cancelled") {
      setError("O login com Google foi cancelado.");
    }
  }, []);

  /*
  | LOGIN NORMAL

  */

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Preencha o email e a palavra-passe.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        credentials: "include",

        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Email ou palavra-passe incorretos.");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Erro ao fazer login:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  | LOGIN COM GOOGLE

  */

  function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    /*
     * IMPORTANTE:
     *
     * mode=login significa:
     *
     * "Só permita entrar se esta conta Google
     * já estiver cadastrada no agenda+."
     */

    window.location.href = "/api/auth/google?mode=login";
  }

  /*
  | LOGIN COM APPLE

  */

  function handleAppleLogin() {
    setError("O login com Apple ainda não está disponível.");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-white text-neutral-950">
      <div className="grid min-h-screen lg:grid-cols-[1.06fr_0.94fr]">
        {/* PAINEL ESQUERDO */}

        <section className="login-panel relative hidden min-h-screen overflow-hidden bg-[#05070b] lg:flex">
          <div aria-hidden="true" className="login-orb login-orb-one" />

          <div aria-hidden="true" className="login-orb login-orb-two" />

          <div aria-hidden="true" className="login-orb login-orb-three" />

          <div aria-hidden="true" className="login-grid absolute inset-0" />

          <div
            aria-hidden="true"
            className="absolute left-0 top-0 h-full w-px bg-gradient-to-b from-transparent via-blue-500/30 to-transparent"
          />

          <div className="relative z-10 flex min-h-screen w-full flex-col px-10 py-9 xl:px-16">
            {/* BRAND */}

            <div className="login-enter login-delay-1">
              <Link
                href="/"
                className="group inline-flex items-center gap-3"
                aria-label="agenda+"
              >
                <BrandLogo
                  size={40}
                  tagline
                  descriptor
                  className="text-white"
                  plusClassName="text-[#8FFFC7]"
                  iconClassName="shadow-[0_10px_35px_rgba(0,0,0,0.25)] transition-transform duration-500 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>

            {/* HERO */}

            <div className="flex flex-1 items-center">
              <div className="w-full max-w-[680px]">
                <div className="login-enter login-delay-2 mb-7 flex items-center gap-3">
                  <span className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 backdrop-blur-md">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />

                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" />
                    </span>
                    Plataforma inteligente
                  </span>
                </div>

                <h1 className="login-enter login-delay-3 max-w-[650px] text-[48px] font-semibold leading-[0.98] tracking-[-0.055em] text-white xl:text-[68px]">
                  Tudo o que o seu
                  <br />
                  negócio precisa.
                  <br />
                  <span className="login-gradient-text">Num só lugar.</span>
                </h1>

                <p className="login-enter login-delay-4 mt-7 max-w-[570px] text-[15px] leading-7 text-slate-400 xl:text-[16px]">
                  Centralize operações, clientes, equipas, serviços,
                  agendamentos e pagamentos numa experiência simples,
                  inteligente e preparada para crescer.
                </p>

                {/* MOCKUP */}

                <div className="login-dashboard relative mt-12 h-[205px] max-w-[590px]">
                  <div
                    aria-hidden="true"
                    className="absolute left-[20%] top-[30%] h-32 w-64 rounded-full bg-blue-600/10 blur-[70px]"
                  />

                  <div className="login-card-main absolute left-0 top-0 w-[325px] rounded-[18px] border border-white/[0.09] bg-white/[0.045] p-4 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-slate-500">
                          Visão geral
                        </p>

                        <p className="mt-1 text-[13px] font-semibold text-white">
                          Desempenho
                        </p>
                      </div>

                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-400/10 bg-blue-500/[0.08] text-blue-400">
                        <BarChart3 size={14} />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <MiniMetric
                        icon={<Users size={12} />}
                        label="Clientes"
                        value="120"
                      />

                      <MiniMetric
                        icon={<CalendarDays size={12} />}
                        label="Agenda"
                        value="24"
                      />

                      <MiniMetric
                        icon={<Clock3 size={12} />}
                        label="Hoje"
                        value="18"
                      />
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-slate-600">
                          Atividade
                        </span>

                        <span className="text-[9px] font-medium text-emerald-400">
                          +18,4%
                        </span>
                      </div>

                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="login-progress h-full w-[76%] rounded-full bg-gradient-to-r from-blue-600 to-blue-400" />
                      </div>
                    </div>
                  </div>

                  <div className="login-card-secondary absolute right-0 top-[58px] w-[230px] rounded-[18px] border border-white/[0.09] bg-[#0b1018]/90 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                          <CalendarDays size={14} />
                        </div>

                        <div>
                          <p className="text-[9px] text-slate-600">Próximo</p>

                          <p className="text-[11px] font-medium text-white">
                            Agendamento
                          </p>
                        </div>
                      </div>

                      <span className="text-[9px] font-medium text-blue-400">
                        14:30
                      </span>
                    </div>

                    <div className="my-3 h-px bg-white/[0.06]" />

                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/20 bg-blue-500 text-[8px] font-bold text-white">
                        FM
                      </div>

                      <div>
                        <p className="text-[9px] font-medium text-slate-300">
                          Cliente confirmado
                        </p>

                        <p className="text-[8px] text-slate-600">
                          Hoje · 14:30
                        </p>
                      </div>

                      <div className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10">
                        <Check size={11} className="text-emerald-400" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* FEATURES */}

                <div className="login-enter login-delay-5 mt-8 flex flex-wrap gap-x-10 gap-y-5">
                  <Feature
                    number="01"
                    title="Operações"
                    description="mais eficientes"
                  />

                  <Feature
                    number="02"
                    title="Experiência"
                    description="mais inteligente"
                  />

                  <Feature
                    number="03"
                    title="Crescimento"
                    description="mais controlado"
                  />
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div className="login-enter login-delay-6 flex items-center justify-between">
              <p className="text-[9px] tracking-wide text-slate-700">
                © {new Date().getFullYear()} NEVRIX. Todos os direitos
                reservados.
              </p>

              <div className="hidden items-center gap-2 text-[9px] text-slate-700 xl:flex">
                <ShieldCheck size={12} />
                Ambiente seguro
              </div>
            </div>
          </div>
        </section>

        {/*PAINEL DIREITO */}

        <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-10 sm:px-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-40 h-[450px] w-[450px] rounded-full bg-blue-500/[0.035] blur-[120px]"
          />

          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-slate-200/50 blur-[120px]"
          />

          <div className="relative z-10 w-full max-w-[430px]">
            {/* MOBILE BRAND */}

            <div className="login-enter login-delay-1 mb-12 lg:hidden">
              <Link
                href="/"
                className="group inline-flex items-center gap-3"
              >
                <BrandLogo size={40} tagline descriptor />
              </Link>
            </div>

            {/* HEADER */}

            <div className="login-enter login-delay-2 mb-9">
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[12px] border border-neutral-200 bg-neutral-50 text-neutral-700 shadow-sm">
                <Lock size={16} strokeWidth={1.8} />
              </div>

              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.22em] text-blue-600">
                Acesso à plataforma
              </p>

              <h2 className="text-[30px] font-semibold tracking-[-0.04em] text-neutral-950">
                Bem-vindo de volta.
              </h2>

              <p className="mt-2 max-w-[390px] text-[13px] leading-6 text-neutral-500">
                Aceda ao seu espaço de gestão e continue de onde ficou.
              </p>
            </div>

            {/* FORM */}

            <form onSubmit={handleSubmit} className="login-enter login-delay-3">
              {/* EMAIL */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-[11px] font-semibold text-neutral-800"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu@email.com"
                    required
                    autoComplete="email"
                    className="h-[51px] w-full rounded-[12px] border border-neutral-200 bg-white pl-11 pr-4 text-[13px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none transition-all duration-300 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/[0.06]"
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-semibold text-neutral-800"
                  >
                    Palavra-passe
                  </label>
                </div>

                <div className="relative">
                  <Lock
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-neutral-400"
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Digite sua palavra-passe"
                    required
                    autoComplete="current-password"
                    className="h-[51px] w-full rounded-[12px] border border-neutral-200 bg-white pl-11 pr-12 text-[13px] text-neutral-900 shadow-[0_2px_10px_rgba(0,0,0,0.02)] outline-none transition-all duration-300 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/[0.06]"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label={
                      showPassword
                        ? "Ocultar palavra-passe"
                        : "Mostrar palavra-passe"
                    }
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className="mt-2 flex justify-end">
                  <Link
                    href="/recuperar-password"
                    className="text-[10px] font-medium text-neutral-500 hover:text-blue-600"
                  >
                    Esqueceu a palavra-passe?
                  </Link>
                </div>
              </div>

              {/* ERRO */}

              {error && (
                <div className="mt-4 rounded-[10px] border border-red-200 bg-red-50 px-3 py-3 text-[11px] leading-5 text-red-600">
                  {error}
                </div>
              )}

              {/* LOGIN */}

              <button
                type="submit"
                disabled={loading || googleLoading}
                className="group relative mt-6 flex h-[51px] w-full items-center justify-center gap-2 overflow-hidden rounded-[12px] bg-[#080a0f] text-[13px] font-semibold text-white shadow-[0_8px_25px_rgba(0,0,0,0.10)] transition-all duration-300 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />A entrar...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight
                      size={16}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* DIVISOR */}

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-neutral-200" />

              <span className="whitespace-nowrap text-[9px] font-medium uppercase tracking-[0.18em] text-neutral-400">
                ou continuar com
              </span>

              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            {/* GOOGLE */}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="group flex h-[50px] w-full items-center justify-center gap-3 rounded-[12px] border border-neutral-200 bg-white text-[13px] font-medium text-neutral-800 transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin text-neutral-500" />
              ) : (
                <GoogleIcon />
              )}

              <span>
                {googleLoading
                  ? "A ligar ao Google..."
                  : "Continuar com Google"}
              </span>
            </button>

            {/* CADASTRO */}

            <p className="mt-8 text-center text-[13px] text-neutral-500">
              Ainda não tem uma conta?{" "}
              <Link
                href="/cadastro"
                className="font-semibold text-neutral-950 hover:text-blue-600"
              >
                Criar conta
              </Link>
            </p>

            <div className="mt-7 flex items-center justify-center gap-2 text-[9px] text-neutral-400">
              <ShieldCheck size={11} />

              <span>A sua informação permanece protegida.</span>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        @keyframes loginEnter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes loginProgress {
          from {
            width: 0;
          }

          to {
            width: 76%;
          }
        }

        .login-enter {
          animation: loginEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .login-delay-1 {
          animation-delay: 0.05s;
        }

        .login-delay-2 {
          animation-delay: 0.12s;
        }

        .login-delay-3 {
          animation-delay: 0.19s;
        }

        .login-delay-4 {
          animation-delay: 0.26s;
        }

        .login-delay-5 {
          animation-delay: 0.33s;
        }

        .login-delay-6 {
          animation-delay: 0.4s;
        }

        .login-panel {
          isolation: isolate;
        }

        .login-orb {
          pointer-events: none;
          position: absolute;
          border-radius: 9999px;
          filter: blur(100px);
          z-index: 0;
        }

        .login-orb-one {
          left: -160px;
          top: -150px;
          width: 500px;
          height: 500px;
          background: rgba(37, 99, 235, 0.09);
        }

        .login-orb-two {
          right: -170px;
          bottom: -180px;
          width: 500px;
          height: 500px;
          background: rgba(79, 70, 229, 0.07);
        }

        .login-orb-three {
          left: 45%;
          top: 35%;
          width: 260px;
          height: 260px;
          background: rgba(37, 99, 235, 0.035);
        }

        .login-grid {
          opacity: 0.035;
          background-image:
            linear-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.8) 1px,
              transparent 1px
            );

          background-size: 52px 52px;
        }

        .login-gradient-text {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #f1f5f9 48%,
            #60a5fa 100%
          );

          background-clip: text;
          -webkit-background-clip: text;
          color: transparent;
          -webkit-text-fill-color: transparent;
        }

        .login-progress {
          animation: loginProgress 1.5s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
        }

        .login-card-main {
          animation: loginEnter 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both;
        }

        .login-card-secondary {
          animation: loginEnter 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.7s both;
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            animation-duration: 0.01ms !important;
            animation-delay: 0ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}

/*FEATURE */

function Feature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group flex items-start gap-3">
      <span className="pt-0.5 text-[10px] font-semibold tracking-[0.12em] text-blue-400">
        {number}
      </span>

      <div>
        <p className="text-[10px] font-medium text-slate-300">{title}</p>

        <p className="mt-0.5 text-[9px] text-slate-600">{description}</p>
      </div>
    </div>
  );
}

/* MINI METRIC*/

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.055] bg-black/20 p-2.5">
      <div className="flex items-center gap-1.5 text-blue-400">
        {icon}

        <span className="text-[8px] text-slate-600">{label}</span>
      </div>

      <p className="mt-1.5 text-[15px] font-semibold text-white">{value}</p>
    </div>
  );
}

/* GOOGLE ICON*/

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
