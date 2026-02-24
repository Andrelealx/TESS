"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { ChatMessageItem } from "@/components/chat-message";
import { ChatMessage, ConversationSummary, PublicUser } from "@/lib/types";

type ChatShellProps = {
  user: PublicUser;
  initialConversations: ConversationSummary[];
};

type ConversationResponse = {
  conversation: {
    id: string;
    title: string;
    messages: ChatMessage[];
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function shortenText(value: string, max = 52) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max)}...`;
}

export function ChatShell({ user, initialConversations }: ChatShellProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>(initialConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  async function loadConversations() {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Nao foi possivel carregar as conversas.");
    }

    const data = await response.json();
    setConversations(data.conversations || []);
  }

  async function loadConversationMessages(conversationId: string) {
    setIsLoadingMessages(true);
    setError(null);

    try {
      const response = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Nao foi possivel carregar mensagens.");
      }

      const data = (await response.json()) as ConversationResponse;
      setMessages(data.conversation.messages || []);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Erro ao carregar conversa.";
      setError(message);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }

    void loadConversationMessages(selectedConversationId);
  }, [selectedConversationId]);

  async function handleCreateConversation() {
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Nova conversa" }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Erro ao criar conversa.");
      }

      const data = await response.json();
      const created = data.conversation as { id: string; title: string; createdAt: string; updatedAt: string };

      setConversations((prev) => [
        {
          ...created,
          messageCount: 0,
          lastMessage: null,
        },
        ...prev,
      ]);
      setSelectedConversationId(created.id);
      setMessages([]);
      setSidebarOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Erro ao criar conversa.");
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSending) return;

    const content = input.trim();
    if (!content) return;

    setError(null);
    setInput("");
    setIsSending(true);

    const tempUserId = `temp-user-${Date.now()}`;
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const now = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      { id: tempUserId, role: "USER", content, createdAt: now },
      { id: tempAssistantId, role: "ASSISTANT", content: "", createdAt: now },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          conversationId: selectedConversationId ?? undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao enviar mensagem.");
      }

      const headerConversationId = response.headers.get("x-conversation-id");
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
          const contentChunk = streamed;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === tempAssistantId ? { ...message, content: contentChunk } : message,
            ),
          );
        }
      } else {
        streamed = await response.text();
        setMessages((prev) =>
          prev.map((message) =>
            message.id === tempAssistantId ? { ...message, content: streamed } : message,
          ),
        );
      }

      const finalConversationId = headerConversationId || selectedConversationId;
      if (finalConversationId) {
        setSelectedConversationId(finalConversationId);
        await loadConversationMessages(finalConversationId);
      }

      await loadConversations();
    } catch (submitError) {
      setMessages((prev) => prev.filter((message) => message.id !== tempUserId && message.id !== tempAssistantId));
      setError(submitError instanceof Error ? submitError.message : "Erro ao processar mensagem.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={[
          "fixed inset-y-0 left-0 z-20 w-80 border-r border-slate-700/80 bg-slate-900/95 px-4 py-5 backdrop-blur transition-transform md:static md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">TESS</p>
            <h2 className="text-lg font-semibold text-white">Conversas</h2>
          </div>
          <button
            type="button"
            onClick={handleCreateConversation}
            className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-sm text-cyan-200 hover:border-cyan-200"
          >
            Nova
          </button>
        </div>

        <div className="mt-4 space-y-2 overflow-y-auto pb-28">
          {conversations.length === 0 && (
            <p className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2 text-sm text-slate-300">
              Nenhuma conversa ainda. Clique em <span className="text-cyan-200">Nova</span> para comecar.
            </p>
          )}

          {conversations.map((conversation) => {
            const isActive = selectedConversationId === conversation.id;
            return (
              <button
                type="button"
                key={conversation.id}
                onClick={() => {
                  setSelectedConversationId(conversation.id);
                  setSidebarOpen(false);
                }}
                className={[
                  "w-full rounded-xl border p-3 text-left transition",
                  isActive
                    ? "border-cyan-300/50 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-800/70 hover:border-cyan-400/40",
                ].join(" ")}
              >
                <p className="truncate text-sm font-medium text-slate-100">{conversation.title}</p>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {conversation.lastMessage
                    ? shortenText(conversation.lastMessage.content, 45)
                    : "Sem mensagens ainda"}
                </p>
                <p className="mt-2 text-[11px] text-slate-500">{formatDate(conversation.updatedAt)}</p>
              </button>
            );
          })}
        </div>

        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-700 bg-slate-900/90 p-4">
          <p className="truncate text-sm font-medium text-slate-100">{user.name || "Usuario TESS"}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <div className="mt-3 flex items-center gap-2">
            {user.role === "ADMIN" && (
              <Link className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs hover:border-cyan-300" href="/admin">
                Admin
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200 hover:border-rose-300"
            >
              Sair
            </button>
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-700/60 bg-slate-950/90 px-4 py-3 backdrop-blur md:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((current) => !current)}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm md:hidden"
          >
            Menu
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Assistente</p>
            <h1 className="text-base font-semibold text-white">{selectedConversation?.title || "Nova conversa"}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Status</p>
            <p className="text-sm text-emerald-300">Online</p>
          </div>
        </header>

        <div className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-cyan-500/8 to-transparent" />

          <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-4">
            {error && (
              <p className="rounded-xl border border-rose-400/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</p>
            )}

            {isLoadingMessages ? (
              <p className="rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
                Carregando conversa...
              </p>
            ) : messages.length === 0 ? (
              <div className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6 text-slate-300">
                <p className="text-sm text-cyan-200">TESS pronta para ajudar.</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Comece uma conversa agora</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Faca perguntas, peca ajuda tecnica ou use a TESS como copiloto no seu fluxo de trabalho.
                </p>
              </div>
            ) : (
              messages.map((message) => <ChatMessageItem key={message.id} message={message} />)
            )}
          </div>
        </div>

        <div className="border-t border-slate-700/70 bg-slate-950/90 px-4 py-4 md:px-8">
          <form className="mx-auto flex w-full max-w-4xl items-end gap-3" onSubmit={handleSubmit}>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Digite sua mensagem para a TESS..."
              rows={2}
              className="max-h-44 min-h-12 flex-1 resize-y rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/70"
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
    </main>
  );
}
