import { supabaseAdmin } from "@/lib/supabase";

// ------------------------------------------------------------------
// Integração com o Google Agenda (Calendário do barbeiro)
// Cada barbeiro conecta a própria conta Google (OAuth 2.0) e os
// agendamentos ficam no calendário dele, sem misturar com o outro.
// As credenciais OAuth (client id/secret) de cada barbeiro ficam na
// tabela employees — cada um tem o próprio app de teste no Google.
// ------------------------------------------------------------------

export const GOOGLE_REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/calendar/callback`;

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_CAL_API = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export type GoogleCreds = {
  clientId: string;
  clientSecret: string;
};

export type CalendarToken = {
  id: string;
  employee_id: string;
  google_email: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
};

/** Credenciais OAuth do Google cadastradas para o barbeiro. */
export async function getEmployeeCreds(
  employeeId: string
): Promise<GoogleCreds | null> {
  const { data } = await supabaseAdmin
    .from("employees")
    .select("google_client_id, google_client_secret")
    .eq("id", employeeId)
    .maybeSingle();
  if (!data?.google_client_id || !data?.google_client_secret) return null;
  return {
    clientId: data.google_client_id,
    clientSecret: data.google_client_secret,
  };
}

/** URL do consentimento do Google (state = employee_id). */
export async function buildAuthUrl(employeeId: string) {
  const creds = await getEmployeeCreds(employeeId);
  if (!creds) {
    throw new Error("Credenciais do Google não configuradas para este barbeiro.");
  }
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: employeeId,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function getCalendarToken(
  employeeId: string
): Promise<CalendarToken | null> {
  const { data } = await supabaseAdmin
    .from("calendar_tokens")
    .select("*")
    .eq("employee_id", employeeId)
    .maybeSingle();
  return data ?? null;
}

async function refreshTokens(refreshToken: string, creds: GoogleCreds) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Falha ao renovar o token do Google.");
  return res.json();
}

/** Troca o código de autorização por access + refresh token. */
export async function exchangeCodeForTokens(
  code: string,
  employeeId: string
) {
  const creds = await getEmployeeCreds(employeeId);
  if (!creds) {
    throw new Error("Credenciais do Google não configuradas para este barbeiro.");
  }
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Falha ao obter os tokens do Google.");
  return res.json();
}

/** Guarda/atualiza o token do barbeiro após o consentimento. */
export async function storeTokens(
  employeeId: string,
  googleEmail: string | null,
  tokens: { access_token: string; refresh_token: string; expires_in?: number }
) {
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000)
    .toISOString();
  const existing = await getCalendarToken(employeeId);
  const fields: Record<string, unknown> = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
    google_email: googleEmail,
    updated_at: new Date().toISOString(),
  };
  if (existing) {
    return supabaseAdmin
      .from("calendar_tokens")
      .update(fields)
      .eq("employee_id", employeeId);
  }
  return supabaseAdmin.from("calendar_tokens").insert({
    employee_id: employeeId,
    google_email: googleEmail,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: expiresAt,
  });
}

/** Token de acesso válido (renova se necessário). */
export async function getAccessToken(employeeId: string) {
  const token = await getCalendarToken(employeeId);
  const creds = await getEmployeeCreds(employeeId);
  if (!token?.refresh_token || !creds) return null;

  const isExpired = !token.expires_at || new Date(token.expires_at).getTime() < Date.now() + 60_000;
  if (!isExpired && token.access_token) return token.access_token;

  try {
    const fresh = await refreshTokens(token.refresh_token, creds);
    const expiresAt = new Date(
      Date.now() + (fresh.expires_in ?? 3600) * 1000
    ).toISOString();
    await supabaseAdmin
      .from("calendar_tokens")
      .update({
        access_token: fresh.access_token,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("employee_id", employeeId);
    return fresh.access_token as string;
  } catch {
    return null;
  }
}

/** Remove o vínculo com o Google do barbeiro. */
export async function disconnectTokens(employeeId: string) {
  return supabaseAdmin.from("calendar_tokens").delete().eq("employee_id", employeeId);
}

type EventInput = {
  summary: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time: string | null; // HH:MM ou null = dia inteiro
  durationMinutes: number;
  eventId?: string | null;
};

async function googleFetch(accessToken: string, url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Calendar: ${res.status} ${text}`);
  }
  return res.json();
}

export async function upsertCalendarEvent(
  employeeId: string,
  input: EventInput
): Promise<string | null> {
  const accessToken = await getAccessToken(employeeId);
  if (!accessToken) return null;

  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
  };
  if (input.time) {
    body.start = {
      dateTime: `${input.date}T${input.time}:00`,
      timeZone: "America/Sao_Paulo",
    };
    const [h, m] = input.time.split(":").map(Number);
    const endMin = h * 60 + m + (input.durationMinutes || 30);
    body.end = {
      dateTime: `${input.date}T${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(
        endMin % 60
      ).padStart(2, "0")}:00`,
      timeZone: "America/Sao_Paulo",
    };
  } else {
    body.start = { date: input.date };
    body.end = { date: input.date };
  }

  try {
    if (input.eventId) {
      await googleFetch(
        accessToken,
        `${GOOGLE_CAL_API}/${encodeURIComponent(input.eventId)}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      return input.eventId;
    }
    const created = await googleFetch(accessToken, GOOGLE_CAL_API, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return created.id as string;
  } catch {
    return input.eventId ?? null;
  }
}

export async function deleteCalendarEvent(
  employeeId: string,
  eventId: string
): Promise<void> {
  const accessToken = await getAccessToken(employeeId);
  if (!accessToken || !eventId) return;
  try {
    await fetch(`${GOOGLE_CAL_API}/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // best effort
  }
}