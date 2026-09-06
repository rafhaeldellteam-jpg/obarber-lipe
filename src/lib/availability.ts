import { supabaseAdmin } from "@/lib/supabase";
import { DEFAULT_WORKING_HOURS } from "@/lib/config";
import { today as todayStr, nowTime } from "@/lib/utils";

export type WorkingHours = {
  start: string;
  end: string;
  interval_minutes: number;
};

export async function getWorkingHours(): Promise<WorkingHours> {
  const hours: WorkingHours = { ...DEFAULT_WORKING_HOURS };
  try {
    const { data } = await supabaseAdmin
      .from("settings")
      .select("key,value");
    if (data) {
      const map = Object.fromEntries(data.map((s) => [s.key, s.value]));
      if (map.working_hours_start) hours.start = map.working_hours_start;
      if (map.working_hours_end) hours.end = map.working_hours_end;
      if (map.interval_minutes) {
        hours.interval_minutes = Number(map.interval_minutes) || 30;
      }
    }
  } catch {
    // mantém defaults
  }
  return hours;
}

export function generateSlots(start: string, end: string, interval: number) {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur < endMin) {
    slots.push(
      `${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(
        cur % 60
      ).padStart(2, "0")}`
    );
    cur += interval;
  }
  return slots;
}

export async function computeAvailableSlots(options: {
  date: string;
  employeeId?: string | null;
}) {
  const { date, employeeId = null } = options;
  const hours = await getWorkingHours();
  const slots = generateSlots(
    hours.start,
    hours.end,
    hours.interval_minutes
  );

  const datEvent = todayStr();
  const isToday = date === datEvent;
  const tNow = nowTime();

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("active", true);

  const employeeIds = (employees ?? []).map((e) => e.id);

  let activeEmployeeIds: string[] = employeeIds;

  if (employeeId) {
    activeEmployeeIds = [employeeId];
  }

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("appointment_time, employee_id")
    .eq("appointment_date", date)
    .in("status", ["pendente", "confirmado"])
    .in(
      "employee_id",
      employeeId ? [employeeId] : employeeIds.length ? employeeIds : [""]
    );

  const { data: blocked } = await supabaseAdmin
    .from("blocked_slots")
    .select("block_time, employee_id")
    .eq("block_date", date);

  const blockedTimes = new Map<string, Set<string | null>>();
  for (const b of blocked ?? []) {
    const key = b.employee_id ?? "all";
    if (!blockedTimes.has(key)) blockedTimes.set(key, new Set());
    blockedTimes.get(key)!.add(b.block_time ?? null);
  }

  const takenByEmployee = new Map<string, Set<string>>();
  for (const a of appointments ?? []) {
    if (!a.employee_id) continue;
    if (!takenByEmployee.has(a.employee_id))
      takenByEmployee.set(a.employee_id, new Set());
    takenByEmployee.get(a.employee_id)!.add(a.appointment_time);
  }

  const result = slots.map((time) => {
    if (isToday && time <= tNow) return { time, available: false };

    const candidates =
      activeEmployeeIds.length > 0 ? activeEmployeeIds : employeeIds;

    const freeEmployees = candidates.filter((empId) => {
      if (takenByEmployee.get(empId)?.has(time)) return false;
      if (blockedTimes.get(empId)?.has(time)) return false;
      if (blockedTimes.get(empId)?.has(null)) return false;
      if (blockedTimes.get("all")?.has(time)) return false;
      if (blockedTimes.get("all")?.has(null)) return false;
      return true;
    });

    return { time, available: freeEmployees.length > 0 };
  });

  return { slots: result, hours };
}

export async function findFreeEmployee(options: {
  date: string;
  time: string;
  excludedEmployeeId?: string | null;
}) {
  const { date, time, excludedEmployeeId = null } = options;

  const { data: employees } = await supabaseAdmin
    .from("employees")
    .select("id")
    .eq("active", true);

  const employeesList = employees ?? [];

  const { data: appointments } = await supabaseAdmin
    .from("appointments")
    .select("employee_id")
    .eq("appointment_date", date)
    .eq("appointment_time", time)
    .in("status", ["pendente", "confirmado"]);

  const { data: blocked } = await supabaseAdmin
    .from("blocked_slots")
    .select("employee_id, block_time")
    .eq("block_date", date);

  const takenByEmployee = new Set((appointments ?? []).map((a) => a.employee_id));
  const blockedAll = (blocked ?? []).some(
    (b) => (b.employee_id === null || b.employee_id === undefined) &&
      (b.block_time === null || b.block_time === time)
  );

  return (
    employeesList.find((e) => {
      if (e.id === excludedEmployeeId) return false;
      if (takenByEmployee.has(e.id)) return false;
      if (blockedAll) return false;
      const empBlocked = (blocked ?? []).some(
        (b) => b.employee_id === e.id &&
          (b.block_time === null || b.block_time === time)
      );
      return !empBlocked;
    }) ?? null
  );
}