import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/http";
import { getClientIp } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeSingleLine } from "@/lib/sanitize";
import { requireSessionFromRequest } from "@/lib/session";
import { createConversationSchema } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionFromRequest(request);

    const rate = checkRateLimit(`conversations:${session.userId}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Limite de requisições atingido." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, createdAt: true, role: true },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messageCount: conversation._count.messages,
        lastMessage: conversation.messages[0] || null,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = requireSessionFromRequest(request);
    const ip = getClientIp(request);

    const rate = checkRateLimit(`conversation-create:${session.userId}:${ip}`, 30, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas criações em pouco tempo. Tente novamente." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const rawBody = await request.text();
    const payload = rawBody ? createConversationSchema.parse(JSON.parse(rawBody)) : {};

    const title = payload.title ? sanitizeSingleLine(payload.title, 120) : "Nova conversa";
    const conversation = await prisma.conversation.create({
      data: {
        userId: session.userId,
        title,
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
