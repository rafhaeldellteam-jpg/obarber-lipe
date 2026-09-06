import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";
import { APPOINTMENT_STATUS } from "@/lib/config";

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
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  const email = searchParams.get("email");
  const phone = searchParams.get("phone");

  let query = supabaseAdmin
    .from("appointments")
    .select("*, services(name), employees(name)")
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false });

  // Isolamento: barbeiro só enxerga o próprio
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  if (status && status !== "todos") query = query.eq("status", status);
  if (date) query = query.eq("appointment_date", date);
  if (email) query = query.eq("client_email", email);
  if (phone) query = query.eq("client_phone", phone);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: data ?? [] });
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

  let body: { id?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Corpo inválido." }, { status: 400 });
  }

  const allowed: string[] = Object.values(APPOINTMENT_STATUS);
  if (!body.id || !body.status || !allowed.includes(body.status)) {
    return NextResponse.json({ ok: false, message: "Dados inválidos." }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("appointments")
    .update({ status: body.status })
    .eq("id", body.id);

  // Barbeiro só pode alterar os próprios agendamentos
  if (ctx.isBarber && ctx.employeeId) {
    query = query.eq("employee_id", ctx.employeeId);
  }

  const { data, error } = await query
    .select("*, services(name), employees(name)")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Se o barbeiro tentou alterar um que não era dele, data vem null
  if (!data) {
    return NextResponse.json(
      { ok: false, message: "Agendamento não encontrado." },
      { status: 404 }
    );
  }

  // Ao concluir o corte, envia e-mail pedindo feedback (melhor esforço)
  if (body.status === "concluido" && data.client_email) {
    try {
      const { sendMail, emailTemplate, buttonHtml, siteUrl } = await import("@/lib/email");
      const employeeName = data.employees?.name ?? "nosso time";
      const dateBR = data.appointment_date?.split("-").reverse().join("/") ?? "";
      await sendMail({
        to: data.client_email,
        subject: `Como foi seu corte na Obarber Lipe? ⭐`,
        html: emailTemplate(`
          <p style="margin:0 0 12px;">Olá, <strong>${data.client_name ?? ""}</strong>!</p>
          <p style="margin:0 0 12px;">Seu corte com <strong>${employeeName}</strong> em ${dateBR} às ${data.appointment_time ?? ""} foi concluído. ✂️</p>
          <p style="margin:0;">Sua opinião vale muito: avalie de <strong>1 a 5 estrelas</strong> e, se quiser, deixe um comentário rápido. Leva menos de um minuto!</p>
          ${buttonHtml(`${siteUrl}/me?tab=feedbacks`, "Avaliar agora ⭐")}
          <p style="margin:0;color:#737373;font-size:12px;text-align:center;">Até o próximo corte!</p>
        `),
      });
    } catch {
      // melhor esforço — não bloqueia a conclusão
    }
  }

  // Ao cancelar, remove o evento do Google Agenda do barbeiro
  if (body.status === "cancelado" && data.employee_id && data.calendar_event_id) {
    try {
      const { deleteCalendarEvent } = await import("@/lib/calendar");
      await deleteCalendarEvent(data.employee_id, data.calendar_event_id);
      await supabaseAdmin
        .from("appointments")
        .update({ calendar_event_id: null })
        .eq("id", data.id);
    } catch {
      // melhor esforço
    }
  }

  return NextResponse.json({ ok: true, data });
}