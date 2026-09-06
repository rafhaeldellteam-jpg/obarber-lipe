import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getWorkingHours, generateSlots, findFreeEmployee } from "@/lib/availability";
import { rateLimit } from "@/lib/rate-limit";
import { today, unmaskPhone } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit(`appointments:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas requisições. Aguarde um instante." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  const clientName = String(body.clientName ?? "").trim();
  const clientPhone = unmaskPhone(String(body.clientPhone ?? ""));
  const employeeId = body.employeeId ? String(body.employeeId) : null;
  const serviceId = String(body.serviceId ?? "").trim();
  const date = String(body.appointmentDate ?? "").trim();
  const time = String(body.appointmentTime ?? "").trim();
  const notes = String(body.notes ?? "").trim();

  if (clientName.length < 2 || clientName.length > 80) {
    return NextResponse.json(
      { ok: false, message: "Informe um nome válido (2 a 80 caracteres)." },
      { status: 400 }
    );
  }
  if (!/^\d{10,11}$/.test(clientPhone)) {
    return NextResponse.json(
      { ok: false, message: "Informe um WhatsApp válido com DDD." },
      { status: 400 }
    );
  }
  if (!serviceId) {
    return NextResponse.json(
      { ok: false, message: "Selecione um serviço." },
      { status: 400 }
    );
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, message: "Data inválida." },
      { status: 400 }
    );
  }

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("*")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();

  if (!service) {
    return NextResponse.json(
      { ok: false, message: "Serviço indisponível." },
      { status: 400 }
    );
  }

  if (employeeId) {
    const { data: employee } = await supabaseAdmin
      .from("employees")
      .select("id")
      .eq("id", employeeId)
      .eq("active", true)
      .maybeSingle();
    if (!employee) {
      return NextResponse.json(
        { ok: false, message: "Profissional indisponível." },
        { status: 400 }
      );
    }
  }

  const hours = await getWorkingHours();
  const validSlots = generateSlots(
    hours.start,
    hours.end,
    hours.interval_minutes
  );

  if (!validSlots.includes(time)) {
    return NextResponse.json(
      { ok: false, message: "Horário fora do expediente." },
      { status: 400 }
    );
  }

  if (date === today() && time <= new Date().toTimeString().slice(0, 5)) {
    return NextResponse.json(
      { ok: false, message: "Esse horário já passou. Escolha outro." },
      { status: 400 }
    );
  }

  // Se o cliente estiver autenticado no Supabase, vincula o agendamento a ele
  const { createClient } = await import("@/lib/supabase-server");
  const supabaseSsr = await createClient();
  const {
    data: { user: authedUser },
  } = await supabaseSsr.auth.getUser();
  const clientEmail = authedUser?.email ?? null;

  // Se logado e informou email, garante que bate com o da conta
  const finalClientEmail =
    clientEmail ||
    (String(body.clientEmail ?? "").trim().toLowerCase() || null);

  const finalEmployeeId = employeeId ||
    (await findFreeEmployee({ date, time }))?.id ||
    null;

  if (employeeId && finalEmployeeId) {
    const { data: conflict, error: conflictError } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("appointment_date", date)
      .eq("appointment_time", time)
      .eq("employee_id", finalEmployeeId)
      .in("status", ["pendente", "confirmado"])
      .maybeSingle();

    if (conflictError) {
      return NextResponse.json(
        { ok: false, message: "Erro ao verificar o horário." },
        { status: 500 }
      );
    }
    if (conflict) {
      return NextResponse.json(
        { ok: false, message: "Esse horário acabou de ser reservado. Escolha outro." },
        { status: 409 }
      );
    }
  }

  const { data: appointment, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      client_name: clientName,
      client_phone: clientPhone,
      client_email: finalClientEmail,
      employee_id: finalEmployeeId,
      service_id: serviceId,
      appointment_date: date,
      appointment_time: time,
      status: "pendente",
      notes: notes || null,
    })
    .select("*, services(name), employees(name)")
    .single();

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error.code === "23505"
            ? "Esse horário já foi reservado. Escolha outro."
            : "Não foi possível agendar. Tente novamente.",
      },
      { status: 409 }
    );
  }

  // Sincroniza com o Google Agenda do barbeiro escolhido (se conectado)
  if (appointment && appointment.employee_id && appointment.service) {
    try {
      const { upsertCalendarEvent } = await import("@/lib/calendar");
      const eventId = await upsertCalendarEvent(appointment.employee_id, {
        summary: `${service.name} — ${appointment.client_name}`,
        description: appointment.notes ?? "",
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        durationMinutes: service.duration_minutes ?? 30,
      });
      if (eventId) {
        await supabaseAdmin
          .from("appointments")
          .update({ calendar_event_id: eventId })
          .eq("id", appointment.id);
      }
    } catch {
      // agenda não é obrigatória; segue sem evento
    }
  }

  return NextResponse.json(
    { ok: true, message: "Agendamento criado com sucesso!", data: appointment },
    { status: 201 }
  );
}