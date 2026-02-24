import "server-only";

import { UserRole } from "@prisma/client";
import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "tess_token";
export const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AuthTokenPayload = {
  userId: string;
  email: string;
  role: UserRole;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET não configurado.");
  }
  return secret;
}

export function createAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: AUTH_TOKEN_MAX_AGE_SECONDS });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (typeof decoded === "string") {
      return null;
    }
    return decoded as AuthTokenPayload;
  } catch {
    return null;
  }
}
