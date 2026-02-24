"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload = isRegister
        ? { name: name.trim() || undefined, email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await fetch(`/api/auth/${isRegister ? "register" : "login"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Falha na autenticacao.");
        return;
      }

      router.push("/chat");
      router.refresh();
    } catch {
      setError("Erro de rede. Verifique sua conexao e tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-14 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08),transparent_58%)]" />
      </div>

      <section className="relative mx-auto w-full max-w-md rounded-2xl border border-cyan-300/30 bg-slate-900/75 p-8 shadow-[0_0_80px_rgba(34,211,238,0.12)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">TESS Assistant</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">{isRegister ? "Criar conta" : "Entrar na plataforma"}</h1>
        <p className="mt-2 text-sm text-slate-300/80">
          {isRegister
            ? "Cadastre-se para comecar suas conversas com a TESS."
            : "Acesse sua conta para continuar seu historico de conversas."}
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <label className="block space-y-1">
              <span className="text-sm text-slate-200">Nome</span>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-cyan-200/20 bg-slate-800/90 px-4 py-2.5 text-slate-100 outline-none ring-0 transition focus:border-cyan-300/70"
                placeholder="Seu nome"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-slate-200">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-cyan-200/20 bg-slate-800/90 px-4 py-2.5 text-slate-100 outline-none ring-0 transition focus:border-cyan-300/70"
              placeholder="voce@empresa.com"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm text-slate-200">Senha</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-cyan-200/20 bg-slate-800/90 px-4 py-2.5 text-slate-100 outline-none ring-0 transition focus:border-cyan-300/70"
              placeholder="Minimo 8 caracteres"
            />
          </label>

          {error && <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-4 py-2.5 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Processando..." : isRegister ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          {isRegister ? "Ja possui conta?" : "Ainda nao possui conta?"}{" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Fazer login" : "Criar conta"}
          </Link>
        </p>

        <p className="mt-3 text-center text-sm text-slate-400">
          Quer testar antes?{" "}
          <Link className="font-medium text-cyan-300 hover:text-cyan-200" href="/demo">
            Abrir amostra sem login
          </Link>
        </p>
      </section>
    </main>
  );
}
