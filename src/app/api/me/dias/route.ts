import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { computeAvailableSlots } from "@/lib/availability";
import { today, addDays } from "@/lib/utils";

// Dias disponíveis para agendamento (próximos N dias) no painel do cliente.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }
  if (isAdminEmail(user.email)) {
    return NextResponse.json({ ok: false, message: "Use o painel da equipe." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employee_id") || null;
  const days = Math.min(Number(searchParams.get("days")) || 14, 30);

  const start = today();
  const dates: string[] = [];
  for (let i = 0; i < days; i++) dates.push(addDays(start, i));

  const items = await Promise.all(
    dates.map(async (date) => {
      const { slots } = await computeAvailableSlots({ date, employeeId });
      return {
        date,
        slots,
        availableCount: slots.filter((s) => s.available).length,
      };
    })
  );

  return NextResponse.json({
    ok: true,
    data: {
      days: items,
      employeeId,
    },
  });
}