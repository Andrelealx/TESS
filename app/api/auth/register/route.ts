import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, AUTH_TOKEN_MAX_AGE_SECONDS, createAuthToken } from "@/lib/auth";
import { ApiError, handleApiError } from "@/lib/http";
import { getClientIp } from "@/lib/network";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeSingleLine } from "@/lib/sanitize";
import { registerSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`auth-register:${ip}`, 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas. Tente novamente em instantes." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const parsed = registerSchema.parse(await request.json());
    const email = sanitizeSingleLine(parsed.email.toLowerCase(), 120);
    const name = parsed.name ? sanitizeSingleLine(parsed.name, 80) : null;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(409, "E-mail já cadastrado.");
    }

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const isAdmin = process.env.ADMIN_EMAIL?.toLowerCase() === email;

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: isAdmin ? "ADMIN" : "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    const token = createAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({ user }, { status: 201 });
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
