import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export const chatSchema = z.object({
  conversationId: z.string().cuid().optional(),
  message: z.string().trim().min(1).max(4000),
});

const demoHistoryItemSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(2000),
});

export const demoChatSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(demoHistoryItemSchema).max(20).optional().default([]),
});
