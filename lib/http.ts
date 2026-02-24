import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.status);
  }

  if (error instanceof SyntaxError) {
    return errorResponse("JSON inválido.", 400);
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Dados inválidos.",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  console.error("Erro não tratado em API:", error);
  return errorResponse("Erro interno do servidor.", 500);
}
