import { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAiAvailability, useAiSuggest, type SuggestionInput } from "@/api/ai";
import { getErrorMessage } from "@/lib/api";
import { richTextHtml, richTextToText } from "@/lib/rich-text";
import { Modal } from "./Modal";
import { RichText } from "./RichText";

export function AiAssistant({ context, value, onChange }: { context: Omit<SuggestionInput, "currentText" | "instruction">; value: string; onChange: (value: string) => void }) {
  const availability = useAiAvailability(), suggest = useAiSuggest();
  const [open, setOpen] = useState(false), [instruction, setInstruction] = useState("");
  const snapshot = useRef("");
  const limit = context.feature === "SCRIPT" ? 10000 : 5000;
  function apply(append: boolean) {
    if (!suggest.data) return;
    if (!append && value !== snapshot.current) { toast.error("Isi editor telah berubah. Buka ulang bantuan AI sebelum mengganti isi."); return; }
    const result = (append && value ? richTextHtml(value) : "") + richTextHtml(suggest.data.text);
    if (result.length > limit) { toast.error("Hasil terlalu panjang untuk editor. Buat saran yang lebih ringkas."); return; }
    onChange(result); setOpen(false); toast.success("Saran AI dimasukkan ke editor. Simpan saat sudah siap.");
  }
  return <div className="grid gap-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-xs text-base-content/60">{availability.data ? availability.data.enabled ? `${availability.data.usedToday}/${availability.data.dailyLimit} bantuan hari ini` : "Bantuan AI dinonaktifkan" : "Bantuan penulisan AI"}</span>
      <button type="button" className="btn btn-sm btn-outline border-primary/30 text-primary" disabled={availability.data?.enabled === false} onClick={() => {
        if (context.title.trim().length < 3) { toast.error("Isi judul minimal 3 karakter dahulu"); return; }
        snapshot.current = value; suggest.reset(); setOpen(true);
      }}><Sparkles className="size-4" />Bantu dengan AI</button>
    </div>
    <Modal open={open} onClose={() => setOpen(false)} title={context.feature === "SCRIPT" ? "Bantu menulis script" : "Kembangkan deskripsi ide"} wide footer={<div className="flex flex-wrap justify-end gap-2">
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Tutup</button>
      {suggest.data && <><button type="button" className="btn btn-outline" onClick={() => apply(true)}>Tambahkan</button><button type="button" className="btn btn-primary" onClick={() => apply(false)}>Gunakan hasil</button></>}
    </div>}>
      <div className="grid gap-4">
        <p className="text-sm text-base-content/65">AI menggunakan judul, platform, tone, serta isi editor saat ini. Hasil dapat kamu tinjau sebelum mengganti atau menambahkan isi.</p>
        <label className="grid gap-2 text-sm font-semibold">Arahan tambahan (opsional)<textarea className="textarea textarea-bordered w-full font-normal" maxLength={1000} rows={3} placeholder="mis. Gunakan bahasa santai dan berikan contoh yang dekat dengan audiens" value={instruction} onChange={(e) => setInstruction(e.target.value)} disabled={suggest.isPending} /></label>
        <p className="text-xs text-base-content/60">Penyedia: {availability.data?.providerName ?? "sesuai pengaturan"}. Jika memakai API cloud, konteks di atas dikirim ke penyedia tersebut.</p>
        <button type="button" className="btn btn-primary" disabled={suggest.isPending} onClick={() => suggest.mutate({ ...context, currentText: richTextToText(snapshot.current), instruction })}>{suggest.isPending ? <><span className="loading loading-spinner loading-sm" />AI sedang menulis…</> : <><Sparkles className="size-4" />{suggest.data ? "Buat saran lagi" : "Buat saran"}</>}</button>
        {suggest.isPending && <p className="text-xs text-base-content/60">Model lokal dapat memerlukan beberapa menit, terutama saat pertama dimuat.</p>}
        {suggest.error && <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">{getErrorMessage(suggest.error)}</p>}
        {suggest.data && <section className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="mb-3 text-xs font-bold uppercase text-primary">Pratinjau saran</p><RichText value={suggest.data.text} />{suggest.data.truncated && <p className="mt-3 text-xs text-warning">Hasil mencapai batas panjang. Tinjau atau minta saran yang lebih ringkas.</p>}<p className="mt-3 text-xs text-base-content/60">Periksa kembali fakta dan gaya bahasa sebelum digunakan.</p></section>}
      </div>
    </Modal>
  </div>;
}
