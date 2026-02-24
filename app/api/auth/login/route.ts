import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_TOKEN_MAX_AGE_SECONDS, createAuthToken } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/http";
import { getClientIp } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeSingleLine } from "@/lib/sanitize";
import { loginSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-login:${ip}`, 20, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde e tente novamente." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const parsed = loginSchema.parse(await request.json());
    const email = sanitizeSingleLine(parsed.email.toLowerCase(), 120);

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new ApiError(401, "Credenciais inválidas.");
    }

    const validPassword = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!validPassword) {
      throw new ApiError(401, "Credenciais inválidas.");
    }

    const token = createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 200 },
    );

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      maxAge: AUTH_TOKEN_MAX_AGE_SECONDS,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
