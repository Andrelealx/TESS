import { NextRequest, NextResponse } from "next/server";

import { handleApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireSessionFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const session = requireSessionFromRequest(request);
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
