import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase";

const MAX_COMMENT_LENGTH = 500;
const PHOTO_URL_TTL_SECONDS = 3600;

async function withPhotoUrls<T extends { photo_path: string | null }>(
  rows: T[]
): Promise<Array<Omit<T, "photo_path"> & { photo_url: string | null }>> {
  return Promise.all(
    rows.map(async (row) => {
      const { photo_path, ...rest } = row;
      if (!photo_path) return { ...rest, photo_url: null };
      const { data } = await supabaseAdmin.storage
        .from("feedbacks")
        .createSignedUrl(photo_path, PHOTO_URL_TTL_SECONDS);
      return { ...rest, photo_url: data?.signedUrl ?? null };
    })
  );
}

// Vitrine pública: somente feedbacks aprovados
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("feedbacks")
    .select("id, customer_name, rating, comment, photo_path, created_at")
    .eq("status", "aprovado")
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  const feedbacks = await withPhotoUrls(data ?? []);
  return NextResponse.json({ ok: true, data: feedbacks });
}

// Cliente autenticado envia um feedback (fica pendente de moderação)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Não autenticado." }, { status: 401 });
  }
  if (isAdminEmail(user.email)) {
    return NextResponse.json(
      { ok: false, message: "Equipe usa o painel admin." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const rating = Number(body.rating);
  const comment = String(body.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { ok: false, message: "Escolha uma nota de 1 a 5 estrelas." },
      { status: 400 }
    );
  }
  if (comment.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { ok: false, message: "Comentário muito longo (máx. 500 caracteres)." },
      { status: 400 }
    );
  }

  const customer = (
    await supabase.from("customers").select("id, name").eq("email", user.email).maybeSingle()
  ).data;
  if (!customer) {
    return NextResponse.json(
      { ok: false, message: "Cliente não identificado." },
      { status: 400 }
    );
  }

  // Valida o path da foto (se enviado) e garante que pertence ao cliente
  let photoPath: string | null = null;
  const rawPhotoPath = String(body.photo_path ?? "").trim();
  if (rawPhotoPath) {
    const ownerFolder = user.id;
    if (!rawPhotoPath.startsWith(`${ownerFolder}/`)) {
      return NextResponse.json({ ok: false, message: "Foto inválida." }, { status: 400 });
    }
    const { data: fileExists } = await supabaseAdmin.storage
      .from("feedbacks")
      .list(ownerFolder, { search: rawPhotoPath.split("/")[1] });
    if (!fileExists || fileExists.length === 0) {
      return NextResponse.json({ ok: false, message: "Foto não encontrada." }, { status: 400 });
    }
    photoPath = rawPhotoPath;
  }

  const { error } = await supabaseAdmin.from("feedbacks").insert({
    customer_id: customer.id,
    customer_name: customer.name ?? user.email!.split("@")[0],
    rating,
    comment: comment || null,
    photo_path: photoPath,
    status: "pendente",
  });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, message: "Obrigado! Seu feedback foi enviado e será publicado após aprovação." },
    { status: 201 }
  );
}
