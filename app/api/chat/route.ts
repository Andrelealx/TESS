import { MessageRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { ApiError, handleApiError } from "@/lib/http";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeMessage, sanitizeSingleLine } from "@/lib/sanitize";
import { requireSessionFromRequest } from "@/lib/session";
import { chatSchema } from "@/lib/validators";

export const runtime = "nodejs";

function mapRole(role: MessageRole): "user" | "assistant" | "system" {
  if (role === "ASSISTANT") {
    return "assistant";
  }
  if (role === "SYSTEM") {
    return "system";
  }
  return "user";
}

function buildTitleFromMessage(message: string): string {
  const base = sanitizeSingleLine(message, 72);
  return base.length > 0 ? base : "Nova conversa";
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSessionFromRequest(request);
    const rate = checkRateLimit(`chat:${session.userId}`, 50, 60_000);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Limite de mensagens atingido. Aguarde alguns segundos." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const parsed = chatSchema.parse(await request.json());
    const cleanMessage = sanitizeMessage(parsed.message, 4000);
    if (!cleanMessage) {
      throw new ApiError(400, "Mensagem inválida.");
    }

    let conversation = parsed.conversationId
      ? await prisma.conversation.findUnique({
          where: { id: parsed.conversationId },
          select: { id: true, userId: true, title: true },
        })
      : null;

    if (conversation && conversation.userId !== session.userId && session.role !== "ADMIN") {
      throw new ApiError(403, "Você não tem acesso a essa conversa.");
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.userId,
          title: buildTitleFromMessage(cleanMessage),
        },
        select: {
          id: true,
          userId: true,
          title: true,
        },
      });
    }

    await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "USER",
          content: cleanMessage,
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      }),
    ]);

    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { role: true, content: true },
    });

    const orderedMessages = [...recentMessages].reverse();
    const systemPrompt =
      process.env.TESS_SYSTEM_PROMPT ||
      "Você é TESS, uma assistente de IA profissional, clara e objetiva, com respostas em português.";

    const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...orderedMessages.map((message) => ({
        role: mapRole(message.role),
        content: message.content,
      })),
    ];

    const stream = await getOpenAIClient().chat.completions.create({
      model: getOpenAIModel(),
      messages: openAIMessages,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    let assistantText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (!token) {
              continue;
            }

            assistantText += token;
            controller.enqueue(encoder.encode(token));
          }

          const finalResponse =
            assistantText.trim() || "Desculpe, não consegui gerar uma resposta desta vez.";

          await prisma.$transaction([
            prisma.message.create({
              data: {
                conversationId: conversation.id,
                role: "ASSISTANT",
                content: finalResponse,
              },
            }),
            prisma.conversation.update({
              where: { id: conversation.id },
              data: { updatedAt: new Date() },
            }),
          ]);

          controller.close();
        } catch (error) {
          console.error("Erro no streaming do chat:", error);
          const fallback =
            assistantText.trim() || "Desculpe, ocorreu um erro temporário ao gerar a resposta.";

          try {
            await prisma.$transaction([
              prisma.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "ASSISTANT",
                  content: fallback,
                },
              }),
              prisma.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() },
              }),
            ]);
          } catch (persistError) {
            console.error("Erro ao persistir fallback da resposta:", persistError);
          }

          if (!assistantText.trim()) {
            controller.enqueue(encoder.encode(fallback));
          }

          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Conversation-Id": conversation.id,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
