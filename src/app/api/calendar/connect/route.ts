import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/supabase-server";
import { buildAuthUrl, getEmployeeCreds } from "@/lib/calendar";

// Inicia o fluxo OAuth para conectar o Google Agenda do barbeiro.
// O barbeiro conecta a própria conta (isolamento por employee_id).
export async function GET(request: NextRequest) {
  const ctx = await requireAdmin();
  if (!ctx) {
    return NextResponse.json({ ok: false, message: "Não autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedEmployee = searchParams.get("employee_id");

  // Master/admin podem conectar qualquer barbeiro; barbeiro só o próprio.
  const employeeId =
    ctx.isBarber || !requestedEmployee ? ctx.employeeId : requestedEmployee;

  if (!employeeId) {
    return NextResponse.json(
      { ok: false, message: "Nenhum barbeiro vinculado." },
      { status: 400 }
    );
  }

  const creds = await getEmployeeCreds(employeeId);
  if (!creds) {
    return NextResponse.json(
      { ok: false, message: "Credenciais do Google não configuradas para este barbeiro. Adicione o Client ID/Secret na aba Configurações." },
      { status: 500 }
    );
  }

  try {
    return NextResponse.json({ ok: true, data: { authUrl: await buildAuthUrl(employeeId) } });
  } catch (e) {
    return NextResponse.json(
      { ok: false, message: (e as Error).message },
      { status: 500 }
    );
  }
}