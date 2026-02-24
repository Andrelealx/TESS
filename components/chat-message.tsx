import { MessageRole } from "@prisma/client";

import { ChatMessage } from "@/lib/types";

type ChatMessageProps = {
  message: ChatMessage;
};

function labelForRole(role: MessageRole) {
  if (role === "ASSISTANT") return "TESS";
  if (role === "SYSTEM") return "Sistema";
  return "Você";
}

export function ChatMessageItem({ message }: ChatMessageProps) {
  const isUser = message.role === "USER";

  return (
    <article className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[88%] rounded-2xl border px-4 py-3 shadow-sm md:max-w-[76%]",
          isUser
            ? "border-cyan-300/50 bg-gradient-to-r from-cyan-300/80 to-blue-300/80 text-slate-900"
            : "border-slate-700 bg-slate-800/85 text-slate-100",
        ].join(" ")}
      >
        <p className={`text-xs ${isUser ? "text-slate-700" : "text-cyan-200/80"}`}>{labelForRole(message.role)}</p>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{message.content || "..."}</p>
      </div>
    </article>
  );
}
