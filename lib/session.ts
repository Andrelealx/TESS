import "server-only";

import { type UserRole } from "@prisma/client";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(AUTH_COOKIE_NAME)?.value ?? null;
}

export function getSessionFromRequest(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

export async function getSessionFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  return verifyAuthToken(token);
}

export async function getCurrentUserFromCookies(): Promise<SessionUser | null> {
  const session = await getSessionFromCookies();
  if (!session) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  return user;
}

export function requireSessionFromRequest(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) {
    throw new ApiError(401, "Não autenticado.");
  }
  return session;
}
