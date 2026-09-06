import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireManager, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const VALID_KEYS = ["working_hours_start", "working_hours_end", "interval_minutes"];

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json(
      { ok: false, message: "Configure SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin.from("settings").select("*");
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    data: Object.fromEntries((data ?? []).map((s) => [s.key, s.value])),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireManager();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json(
      { ok: false, message: "Configure SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const entries = Object.entries(body).filter(([k]) => VALID_KEYS.includes(k));

  if (entries.length === 0) {
    return NextResponse.json({ ok: false, message: "Nenhum ajuste válido." }, { status: 400 });
  }

  for (const [key, value] of entries) {
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key, value: String(value) }, { onConflict: "key" });
    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}