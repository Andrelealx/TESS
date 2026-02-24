import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

import { ApiError, handleApiError } from "@/lib/http";
import { getClientIp } from "@/lib/network";
import { getOpenAIClient, getOpenAIModel } from "@/lib/openai";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeMessage } from "@/lib/sanitize";
import { demoChatSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`chat-demo:${ip}`, 20, 60_000);

    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Limite de uso da amostra atingido. Aguarde alguns segundos." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } },
      );
    }

    const parsed = demoChatSchema.parse(await request.json());
    const cleanMessage = sanitizeMessage(parsed.message, 2000);

    if (!cleanMessage) {
      throw new ApiError(400, "Mensagem invalida.");
    }

    const systemPrompt =
      process.env.TESS_DEMO_SYSTEM_PROMPT ||
      "Voce e TESS, assistente de IA profissional, clara e objetiva. Esta e uma amostra sem login.";

    const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = parsed.history.map((item) => ({
      role: item.role,
      content: sanitizeMessage(item.content, 2000),
    }));

    const openAIMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: cleanMessage },
    ];

    const stream = await getOpenAIClient().chat.completions.create({
      model: getOpenAIModel(),
      messages: openAIMessages,
      temperature: 0.7,
      stream: true,
    });

    const encoder = new TextEncoder();
    let assistantText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (!token) {
              continue;
            }

            assistantText += token;
            controller.enqueue(encoder.encode(token));
          }

          if (!assistantText.trim()) {
            controller.enqueue(encoder.encode("Nao foi possivel gerar resposta neste momento."));
          }
          controller.close();
        } catch (error) {
          console.error("Erro no streaming da amostra:", error);
          if (!assistantText.trim()) {
            controller.enqueue(encoder.encode("Erro temporario ao gerar resposta."));
          }
          controller.close();
        }
      },
    });

    return new NextResponse(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Demo-Mode": "true",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
