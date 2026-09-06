import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import {
  getCalendarToken,
  getEmployeeCreds,
  disconnectTokens,
} from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedEmployee = searchParams.get("employee_id");
  const employeeId =
    ctx.isBarber || !requestedEmployee ? ctx.employeeId : requestedEmployee;

  if (!employeeId) {
    return NextResponse.json({
      ok: true,
      data: { connected: false, google_email: null, configured: false },
    });
  }

  const token = await getCalendarToken(employeeId);
  const creds = await getEmployeeCreds(employeeId);
  return NextResponse.json({
    ok: true,
    data: {
      connected: Boolean(token?.refresh_token),
      google_email: token?.google_email ?? null,
      configured: Boolean(creds),
    },
  });
}

export async function DELETE(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  if (ctx.isBarber) {
    // barbeiro pode desconectar a própria conta
    await disconnectTokens(ctx.employeeId!);
    return NextResponse.json({ ok: true });
  }
  const employeeId = searchParams.get("employee_id");
  if (!employeeId) {
    return NextResponse.json({ ok: false, message: "employee_id obrigatório." }, { status: 400 });
  }
  await disconnectTokens(employeeId);
  return NextResponse.json({ ok: true });
}