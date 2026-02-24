import { MessageRole, UserRole } from "@prisma/client";

export type PublicUser = {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    content: string;
    role: MessageRole;
    createdAt: string;
  } | null;
};

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};
