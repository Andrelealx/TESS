import { redirect } from "next/navigation";

import { ChatShell } from "@/components/chat-shell";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromCookies } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getCurrentUserFromCookies();
  if (!user) {
    redirect("/login");
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          content: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  return (
    <ChatShell
      user={user}
      initialConversations={conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        messageCount: conversation._count.messages,
        lastMessage: conversation.messages[0]
          ? {
              content: conversation.messages[0].content,
              role: conversation.messages[0].role,
              createdAt: conversation.messages[0].createdAt.toISOString(),
            }
          : null,
      }))}
    />
  );
}
