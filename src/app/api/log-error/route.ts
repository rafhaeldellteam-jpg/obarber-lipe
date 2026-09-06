import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

type Body = {
  message?: unknown;
  stack?: unknown;
  path?: unknown;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const message =
    typeof body.message === "string" ? body.message.slice(0, 500) : null;
  if (!message) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const stack = typeof body.stack === "string" ? body.stack.slice(0, 4000) : null;
  const path = typeof body.path === "string" ? body.path.slice(0, 300) : null;
  const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 300);

  const { error } = await supabaseAdmin.from("error_logs").insert({
    message,
    stack,
    path,
    user_agent: userAgent,
  });

  if (error) {
    console.warn("[log-error] Falha ao gravar:", error.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  return NextResponse.json({ ok: true });
}
