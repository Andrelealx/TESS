"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type DemoMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
};

type DemoHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export function DemoChat() {
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    const content = input.trim();
    if (!content) return;

    setError(null);
    setInput("");
    setIsSending(true);

    const tempUserId = `demo-user-${Date.now()}`;
    const tempAssistantId = `demo-assistant-${Date.now()}`;

    const nextMessages: DemoMessage[] = [
      ...messages,
      { id: tempUserId, role: "USER", content },
      { id: tempAssistantId, role: "ASSISTANT", content: "" },
    ];
    setMessages(nextMessages);

    try {
      const history: DemoHistoryItem[] = messages.slice(-20).map((message) => ({
        role: message.role === "USER" ? "user" : "assistant",
        content: message.content,
      }));

      const response = await fetch("/api/chat/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao consultar a amostra.");
      }

      let streamed = "";
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            streamed += decoder.decode();
            break;
          }

          streamed += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((message) =>
              message.id === tempAssistantId ? { ...message, content: streamed } : message,
            ),
          );
        }
      } else {
        streamed = await response.text();
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === tempAssistantId ? { ...message, content: streamed || "Sem resposta." } : message,
        ),
      );
    } catch (submitError) {
      setMessages((prev) => prev.filter((message) => message.id !== tempUserId && message.id !== tempAssistantId));
      setError(submitError instanceof Error ? submitError.message : "Erro ao enviar mensagem.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-2xl border border-cyan-400/35 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">TESS Demo</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">Amostra publica sem login</h1>
          <p className="mt-2 text-sm text-slate-300">
            Esta amostra nao salva conversas no banco. Para historico completo por usuario, use conta com login.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="rounded-lg border border-cyan-300/35 px-3 py-1.5 text-sm hover:border-cyan-200" href="/login">
              Fazer login
            </Link>
            <Link className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-cyan-300" href="/register">
              Criar conta
            </Link>
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setError(null);
              }}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-cyan-300"
            >
              Limpar amostra
            </button>
          </div>
        </header>

        <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/70">
          <div className="max-h-[58vh] space-y-4 overflow-y-auto p-5">
            {messages.length === 0 && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
                Envie uma pergunta para testar a TESS sem autenticacao.
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "USER" ? "justify-end" : "justify-start"}`}>
                <div
                  className={[
                    "max-w-[85%] rounded-xl border px-4 py-3 text-sm",
                    message.role === "USER"
                      ? "border-cyan-300/45 bg-cyan-300/85 text-slate-900"
                      : "border-slate-700 bg-slate-800/85 text-slate-100",
                  ].join(" ")}
                >
                  <p className={`text-xs ${message.role === "USER" ? "text-slate-700" : "text-cyan-200/70"}`}>
                    {message.role === "USER" ? "Voce" : "TESS"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content || "..."}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-700 p-5">
            {error && (
              <p className="mb-3 rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
              </p>
            )}
            <form className="flex items-end gap-3" onSubmit={handleSubmit}>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                maxLength={2000}
                placeholder="Digite sua mensagem para testar a TESS..."
                className="min-h-12 flex-1 resize-y rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm outline-none transition focus:border-cyan-300/70"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
