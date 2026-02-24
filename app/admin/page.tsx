import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== "ADMIN") {
    redirect("/chat");
  }

  const [users, conversations, totalMessages] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      take: 50,
    }),
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      take: 100,
    }),
    prisma.message.count(),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <header className="mx-auto flex w-full max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">Painel Administrativo</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">TESS Control Center</h1>
          <p className="mt-1 text-sm text-slate-400">Visão operacional do MVP com usuários e conversas.</p>
        </div>
        <Link href="/chat" className="w-fit rounded-xl border border-slate-600 px-4 py-2 text-sm hover:border-cyan-300">
          Voltar ao chat
        </Link>
      </header>

      <section className="mx-auto mt-8 grid w-full max-w-7xl gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-cyan-400/30 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Usuários</p>
          <p className="mt-2 text-3xl font-semibold text-white">{users.length}</p>
          <p className="mt-1 text-sm text-slate-400">Últimos 50 cadastrados</p>
        </article>

        <article className="rounded-2xl border border-blue-400/30 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-blue-200/70">Conversas</p>
          <p className="mt-2 text-3xl font-semibold text-white">{conversations.length}</p>
          <p className="mt-1 text-sm text-slate-400">Últimas 100 conversas</p>
        </article>

        <article className="rounded-2xl border border-emerald-400/30 bg-slate-900/70 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">Mensagens</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totalMessages}</p>
          <p className="mt-1 text-sm text-slate-400">Total no banco</p>
        </article>
      </section>

      <section className="mx-auto mt-6 grid w-full max-w-7xl gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
          <h2 className="text-lg font-semibold text-white">Lista de usuários</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-2 py-2 font-medium">Nome</th>
                  <th className="px-2 py-2 font-medium">E-mail</th>
                  <th className="px-2 py-2 font-medium">Papel</th>
                  <th className="px-2 py-2 font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {users.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-800/80">
                    <td className="px-2 py-2 text-slate-200">{entry.name || "Sem nome"}</td>
                    <td className="px-2 py-2 text-slate-300">{entry.email}</td>
                    <td className="px-2 py-2 text-slate-300">{entry.role}</td>
                    <td className="px-2 py-2 text-slate-400">
                      {new Intl.DateTimeFormat("pt-BR").format(entry.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-900/65 p-5">
          <h2 className="text-lg font-semibold text-white">Lista de conversas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-slate-400">
                  <th className="px-2 py-2 font-medium">Título</th>
                  <th className="px-2 py-2 font-medium">Usuário</th>
                  <th className="px-2 py-2 font-medium">Atualizado</th>
                </tr>
              </thead>
              <tbody>
                {conversations.map((conversation) => (
                  <tr key={conversation.id} className="border-b border-slate-800/80">
                    <td className="px-2 py-2 text-slate-200">{conversation.title}</td>
                    <td className="px-2 py-2 text-slate-300">{conversation.user.name || conversation.user.email}</td>
                    <td className="px-2 py-2 text-slate-400">
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(conversation.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-dashed border-cyan-300/40 bg-slate-900/50 p-5">
        <h2 className="text-lg font-semibold text-white">Métricas de uso (placeholder)</h2>
        <p className="mt-2 text-sm text-slate-300">
          Espaço reservado para custo por modelo, tokens por usuário, latência média e taxa de sucesso por endpoint.
        </p>
      </section>
    </main>
  );
}
