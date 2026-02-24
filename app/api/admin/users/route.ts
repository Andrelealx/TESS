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

    const rate = checkRateLimit(`admin-users:${session.userId}`, 60, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas requisições." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    });

    return NextResponse.json({
      users: users.map((user) => ({
        ...user,
        conversationCount: user._count.conversations,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
