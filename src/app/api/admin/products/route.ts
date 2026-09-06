import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hasServiceRole } from "@/lib/supabase-server";
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
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  const body = await request.json();
  const { name, description, price, active, sort_order } = body;

  if (!name || typeof String(name).trim() !== "string" || String(name).trim().length < 2) {
    return NextResponse.json({ ok: false, message: "Informe um nome válido." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("products")
    .insert({
      name: String(name).trim(),
      description: description ? String(description) : null,
      price: Number(price) || 0,
      active: active !== undefined ? Boolean(active) : true,
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

  const body = await request.json();
  const { id, name, description, price, active, sort_order } = body;

  if (!id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  const fields: Record<string, unknown> = {};
  if (name !== undefined) fields.name = String(name).trim();
  if (description !== undefined) fields.description = description ? String(description) : null;
  if (price !== undefined) fields.price = Number(price) || 0;
  if (active !== undefined) fields.active = Boolean(active);
  if (sort_order !== undefined) fields.sort_order = Number(sort_order) || 0;

  const { data, error } = await supabaseAdmin
    .from("products")
    .update(fields)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, message: "Produto não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("products").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
