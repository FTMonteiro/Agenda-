"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { AuthHeader, AuthShell } from "@/components/auth/AuthShell";
import { AuthButton, Divider, FormAlert, GoogleButton, PasswordField, TextField } from "@/components/auth/fields";

// Os erros que o callback do Google devolve em ?error=.
const GOOGLE_ERRORS: Record<string, string> = {
  google_not_registered: "Esta conta Google ainda não está cadastrada no agenda+. Crie uma conta primeiro.",
  google: "Não foi possível entrar com o Google. Tente novamente.",
  google_config: "O login com Google ainda não está configurado corretamente no servidor.",
  google_cancelled: "O login com Google foi cancelado.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code && GOOGLE_ERRORS[code]) setError(GOOGLE_ERRORS[code]);
  }, []);

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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Email ou palavra-passe incorretos.");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      console.error("Erro ao fazer login:", error);

      setError(error instanceof Error ? error.message : "Não foi possível realizar o login.");
      setLoading(false);
    }
  }

  // mode=login: só entra se esta conta Google já estiver cadastrada no agenda+.
  function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    window.location.href = "/api/auth/google?mode=login";
  }

  const busy = loading || googleLoading;

  return (
    <AuthShell>
      <AuthHeader title="Entrar na sua conta" description="Use o email e a palavra-passe com que se registou." />

      {error && <FormAlert>{error}</FormAlert>}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <TextField
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nome@exemplo.com"
          autoComplete="email"
          inputMode="email"
          autoFocus
          disabled={busy}
        />

        <PasswordField
          id="password"
          label="Palavra-passe"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          disabled={busy}
        />

        <AuthButton type="submit" loading={loading} disabled={googleLoading} className="w-full">
          {loading ? "A entrar..." : "Entrar"}
        </AuthButton>
      </form>

      <Divider />

      <GoogleButton onClick={handleGoogleLogin} loading={googleLoading} disabled={loading}>
        {googleLoading ? "A ligar ao Google..." : "Continuar com Google"}
      </GoogleButton>

      <p className="mt-8 text-sm text-[var(--muted)]">
        Ainda não tem uma conta?{" "}
        <Link href="/cadastro" className="font-medium text-[var(--brand-text)] hover:underline underline-offset-4">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
