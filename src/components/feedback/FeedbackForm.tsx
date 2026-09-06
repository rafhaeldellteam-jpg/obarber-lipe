"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { createClient } from "@/lib/supabase-browser";
import { StarRating } from "@/components/feedback/StarRating";
import { PhotoIcon, CloseIcon } from "@/components/icons";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function FeedbackForm({
  onSuccess,
}: {
  onSuccess: (message: string) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setError(null);
    if (selected) {
      if (!ACCEPTED_TYPES.includes(selected.type)) {
        setError("Formato inválido. Use JPG, PNG ou WEBP.");
        return;
      }
      if (selected.size > MAX_FILE_SIZE) {
        setError("Foto muito grande (máx. 5 MB).");
        return;
      }
      setPreviewUrl(URL.createObjectURL(selected));
    } else {
      setPreviewUrl(null);
    }
    setFile(selected);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rating < 1) {
      setError("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setBusy(true);
    try {
      let photoPath: string | null = null;

      if (file) {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Sessão expirada. Faça login novamente.");

        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("feedbacks")
          .upload(path, file, { contentType: file.type });
        if (uploadError) throw new Error("Não foi possível enviar a foto: " + uploadError.message);
        photoPath = path;
      }

      const res = await fetch("/api/feedbacks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, photo_path: photoPath }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Erro ao enviar feedback.");

      setRating(0);
      setComment("");
      clearFile();
      onSuccess(json.message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-brand-border bg-brand-card p-5">
      <h3 className="text-lg font-black">Deixe seu feedback</h3>
      <p className="mt-1 text-sm text-brand-muted">
        Sua opinião ajuda outros clientes — e a gente a melhorar sempre.
      </p>

      <div className="mt-4">
        <StarRating value={rating} onChange={setRating} />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Como foi sua experiência? (opcional)"
        rows={3}
        maxLength={500}
        className="mt-3 w-full resize-none rounded-xl border border-brand-border bg-brand-darker px-4 py-3 text-sm text-brand-text placeholder:text-brand-muted/60 btn-focus"
      />

      {previewUrl ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-brand-border bg-brand-darker p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Prévia da foto"
            className="h-14 w-14 rounded-lg object-cover"
          />
          <span className="flex-1 truncate text-xs text-brand-muted">{file?.name}</span>
          <button
            type="button"
            onClick={clearFile}
            aria-label="Remover foto"
            className="grid h-8 w-8 place-items-center rounded-lg text-brand-muted transition-colors hover:text-brand-red btn-focus"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-brand-border px-4 py-2.5 text-sm text-brand-muted transition-colors hover:border-brand-gold/50 hover:text-brand-text btn-focus"
        >
          <PhotoIcon className="h-4 w-4" /> Adicionar foto (opcional)
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <p className="mt-3 rounded-xl border border-brand-red/30 bg-brand-red/10 px-4 py-2.5 text-sm text-brand-red">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-gold-gradient py-3 text-sm font-black text-zinc-950 transition-transform hover:scale-[1.01] btn-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Enviando…" : "Enviar feedback"}
      </button>
    </form>
  );
}
