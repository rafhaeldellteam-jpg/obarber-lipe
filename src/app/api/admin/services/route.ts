import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireManager, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

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

  const { data, error } = await supabaseAdmin
    .from("services")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? [] });
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
  const { name, description, price, duration_minutes, active = true, sort_order = 0 } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ ok: false, message: "Informe um nome válido." }, { status: 400 });
  }
  if (typeof price !== "number" || price <= 0) {
    return NextResponse.json({ ok: false, message: "Informe um preço válido." }, { status: 400 });
  }
  if (typeof duration_minutes !== "number" || duration_minutes <= 0) {
    return NextResponse.json({ ok: false, message: "Informe a duração em minutos." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      price,
      duration_minutes,
      active: Boolean(active),
      sort_order: Number(sort_order) || 0,
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
  if (fields.price !== undefined && (typeof fields.price !== "number" || fields.price <= 0)) {
    return NextResponse.json({ ok: false, message: "Preço inválido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("services")
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

  const { error } = await supabaseAdmin.from("services").delete().eq("id", body.id);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}