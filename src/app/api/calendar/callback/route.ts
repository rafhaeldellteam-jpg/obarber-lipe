import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
} from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state") || "";

  if (error) {
    return NextResponse.redirect(
      new URL("/admin?cal=error", request.url)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/admin?cal=invalid", request.url)
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code, state);

    // Busca o e-mail da conta Google para exibição
    let googleEmail: string | null = null;
    try {
      const me = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (me.ok) {
        const info = await me.json();
        googleEmail = info.email ?? null;
      }
    } catch {
      // melhor esforço
    }

    const { error: dbError } = await storeTokens(
      state,
      googleEmail,
      {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in ?? 3600,
      }
    );

    if (dbError) {
      return NextResponse.redirect(
        new URL("/admin?cal=storeref", request.url)
      );
    }

    return NextResponse.redirect(new URL("/admin?cal=ok", request.url));
  } catch {
    return NextResponse.redirect(
      new URL("/admin?cal=failed", request.url)
    );
  }
}