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
    .from("customer_subscriptions")
    .select("*, plans(name, price), customers(name, phone)")
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
  const { customer_id, plan_id, start_date, end_date, status = "ativo" } = body;

  if (!customer_id || !plan_id || !start_date) {
    return NextResponse.json({ ok: false, message: "Dados incompletos." }, { status: 400 });
  }

  const employeeId = ctx.isBarber ? ctx.employeeId : (body.employee_id || null);

  const { data, error } = await supabaseAdmin
    .from("customer_subscriptions")
    .insert({
      customer_id,
      plan_id,
      employee_id: employeeId,
      status,
      start_date,
      end_date: end_date || null,
    })
    .select("*, plans(name, price), customers(name, phone)")
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

  const subscription = await supabaseAdmin
    .from("customer_subscriptions")
    .select("*, plans(duration_days, name)")
    .eq("id", id)
    .maybeSingle();
  if (!subscription.data) {
    return NextResponse.json({ ok: false, message: "Assinatura não encontrada." }, { status: 404 });
  }

  // Aprovação: calcula período com base no plano e na data atual
  if (fields.status === "ativo") {
    const today = new Date();
    const start = today.toISOString().slice(0, 10);
    const durationDays = subscription.data.plans?.duration_days ?? 30;
    const end = new Date(today.getTime() + durationDays * 86400000)
      .toISOString()
      .slice(0, 10);
    fields.start_date = start;
    fields.end_date = end;
  }

  let query = supabaseAdmin.from("customer_subscriptions").update(fields).eq("id", id);
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  const { data, error } = await query
    .select("*, plans(name, price), customers(name, phone)")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, message: "Assinatura não encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data });
}