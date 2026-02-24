import { NextRequest, NextResponse } from "next/server";

import { ApiError, handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireSessionFromRequest } from "@/lib/session";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSessionFromRequest(request);
    const { id } = await context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversa não encontrada.");
    }

    if (conversation.userId !== session.userId && session.role !== "ADMIN") {
      throw new ApiError(403, "Acesso negado.");
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        messages: conversation.messages,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const session = requireSessionFromRequest(request);
    const { id } = await context.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!conversation) {
      throw new ApiError(404, "Conversa não encontrada.");
    }

    if (conversation.userId !== session.userId && session.role !== "ADMIN") {
      throw new ApiError(403, "Acesso negado.");
    }

    await prisma.conversation.delete({ where: { id: conversation.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
