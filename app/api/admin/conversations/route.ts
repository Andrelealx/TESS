import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireSessionFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionFromRequest(request);
    if (session.role !== "ADMIN") {
      throw new ApiError(403, "Acesso restrito ao administrador.");
    }

    const rate = checkRateLimit(`admin-conversations:${session.userId}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const conversations = await prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((conversation) => ({
        ...conversation,
        messageCount: conversation._count.messages,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
