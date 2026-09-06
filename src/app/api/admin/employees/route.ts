import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireManager, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }
  if (!hasServiceRole()) {
    return NextResponse.json(
      { ok: false, message: "Configure SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Barbeiro não deve ver os e-mails dos colegas (credenciais de acesso)
  const rows = (data ?? []).map((e) =>
    ctx.isBarber ? { ...e, email: e.email === ctx.email ? e.email : null } : e
  );
  return NextResponse.json({ ok: true, data: rows });
}

export async function POST(request: NextRequest) {
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
  const { name, email, phone, specialty, color, active = true } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ ok: false, message: "Informe um nome válido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .insert({
      name: name.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      specialty: specialty?.trim() || null,
      color: color?.trim() || null,
      active: Boolean(active),
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
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
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("employees")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(request: NextRequest) {
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
  if (!body?.id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("employees").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}