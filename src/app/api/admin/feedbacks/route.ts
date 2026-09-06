import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, hasServiceRole } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase";

const PHOTO_URL_TTL_SECONDS = 3600;

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

  let query = supabaseAdmin
    .from("feedbacks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  // Gera signed URLs das fotos para preview na moderação
  const withPhotos = await Promise.all(
    (data ?? []).map(async (row) => {
      if (!row.photo_path) return { ...row, photo_url: null };
      const { data: signed } = await supabaseAdmin.storage
        .from("feedbacks")
        .createSignedUrl(row.photo_path, PHOTO_URL_TTL_SECONDS);
      return { ...row, photo_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json({ ok: true, data: withPhotos });
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

  const body = await request.json();
  const { id, status } = body;

  if (!id || !["aprovado", "recusado"].includes(status)) {
    return NextResponse.json(
      { ok: false, message: "Informe o feedback e um status válido." },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(request: NextRequest) {
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
  if (!ctx.isMaster && !ctx.isAdmin) {
    return NextResponse.json({ ok: false, message: "Somente gestores." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, message: "ID obrigatório." }, { status: 400 });
  }

  // Remove a foto do Storage se existir
  const { data: feedback } = await supabaseAdmin
    .from("feedbacks")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  if (feedback?.photo_path) {
    await supabaseAdmin.storage.from("feedbacks").remove([feedback.photo_path]);
  }

  const { error } = await supabaseAdmin.from("feedbacks").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
