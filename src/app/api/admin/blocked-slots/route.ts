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
  const date = searchParams.get("date");

  let query = supabaseAdmin
    .from("blocked_slots")
    .select("*")
    .order("block_date", { ascending: false });

  // Isolamento: barbeiro só vê/altera os próprios bloqueios
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  if (date) query = query.eq("block_date", date);

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
  const { block_date, block_time, reason, employee_id } = body;

  if (!block_date || !/^\d{4}-\d{2}-\d{2}$/.test(block_date)) {
    return NextResponse.json({ ok: false, message: "Data inválida." }, { status: 400 });
  }
  if (block_time !== undefined && block_time !== null && !/^\d{2}:\d{2}$/.test(block_time)) {
    return NextResponse.json({ ok: false, message: "Horário inválido." }, { status: 400 });
  }

  // Barbeiro só cria bloqueio pra si mesmo
  const targetEmployeeId = ctx.isBarber ? ctx.employeeId : (employee_id || null);

  const { data, error } = await supabaseAdmin
    .from("blocked_slots")
    .insert({
      block_date,
      block_time: block_time || null,
      reason: reason?.trim() || null,
      employee_id: targetEmployeeId,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data }, { status: 201 });
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

  const body = await request.json();
  if (!body?.id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  let query = supabaseAdmin.from("blocked_slots").delete().eq("id", body.id);
  // Barbeiro só apaga o próprio bloqueio
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}