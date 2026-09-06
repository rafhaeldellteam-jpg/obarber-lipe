import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
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
  const search = searchParams.get("search");

  let query = supabaseAdmin
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  // Isolamento: barbeiro só vê os próprios clientes
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }
  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
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
  const { name, phone, email, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json({ ok: false, message: "Informe um nome válido." }, { status: 400 });
  }

  const employeeId = ctx.isBarber ? ctx.employeeId : (body.employee_id || null);

  const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({
      name: name.trim(),
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      employee_id: employeeId,
      notes: notes?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
}