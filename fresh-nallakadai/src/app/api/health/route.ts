import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "Fresh Nalla Kadai",
    timestamp: new Date().toISOString(),
  });
}
