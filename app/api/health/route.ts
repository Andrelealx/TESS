import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "TESS",
    timestamp: new Date().toISOString(),
  });
}
