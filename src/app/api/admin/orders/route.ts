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
  const customerId = searchParams.get("customer_id");
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("customer_orders")
    .select("*, customers(name, phone)")
    .order("created_at", { ascending: false });

  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }
  if (customerId) query = query.eq("customer_id", customerId);
  if (status) query = query.eq("status", status);

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
  const { customer_id, description, amount, status = "pendente" } = body;

  if (!customer_id || !description || typeof amount !== "number") {
    return NextResponse.json({ ok: false, message: "Dados incompletos." }, { status: 400 });
  }

  const employeeId = ctx.isBarber ? ctx.employeeId : (body.employee_id || null);

  const { data, error } = await supabaseAdmin
    .from("customer_orders")
    .insert({
      customer_id,
      employee_id: employeeId,
      description: description.trim(),
      amount,
      status,
    })
    .select("*, customers(name, phone)")
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
  const { id, ...fields } = body;

  if (!id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  let query = supabaseAdmin.from("customer_orders").update(fields).eq("id", id);
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  const { data, error } = await query
    .select("*, customers(name, phone)")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, message: "Pedido não encontrado." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}