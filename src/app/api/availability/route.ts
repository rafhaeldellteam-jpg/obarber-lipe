import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { computeAvailableSlots } from "@/lib/availability";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const rl = rateLimit(`availability:${ip}`, 120, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, message: "Muitas requisições. Tente novamente em instantes." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || "";
  const employeeId = searchParams.get("employeeId") || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { ok: false, message: "Data inválida." },
      { status: 400 }
    );
  }

  const [{ slots }, { data: services }, { data: employees }] =
    await Promise.all([
      computeAvailableSlots({ date, employeeId }),
      supabaseAdmin
        .from("services")
        .select("*")
        .eq("active", true)
        .order("sort_order")
        .order("name"),
      supabaseAdmin
        .from("employees")
        .select("*")
        .eq("active", true)
        .order("name"),
    ]);

  return NextResponse.json({
    ok: true,
    data: {
      slots,
      services: services ?? [],
      employees: employees ?? [],
      date,
      employeeId,
    },
  });
}