export const SITE_NAME = "Obarber Lipe";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const OWNER_WHATSAPP =
  process.env.NEXT_PUBLIC_OWNER_WHATSAPP || "5511913347390";

export const DEFAULT_WORKING_HOURS = {
  start: "09:00",
  end: "19:00",
  interval_minutes: 30,
};

export const ALL_SLOTS_BY_INTERVAL: Record<number, string[]> = {
  15: generateSlots("08:00", "21:00", 15),
  30: generateSlots("08:00", "21:00", 30),
  60: generateSlots("08:00", "21:00", 60),
};

export const APPOINTMENT_STATUS = {
  PENDENTE: "pendente",
  CONFIRMADO: "confirmado",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado",
} as const;

export const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  aguardando: "Aguardando aprovação",
  aprovado: "Aprovado",
  recusado: "Recusado",
  ativo: "Ativo",
  pausado: "Pausado",
  expirado: "Expirado",
  pago: "Pago",
};

function generateSlots(start: string, end: string, interval: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let cur = sh * 60 + sm;
  const endMin = eh * 60 + em;
  while (cur < endMin) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
    cur += interval;
  }
  return slots;
}