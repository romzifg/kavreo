import { useState } from "react";
import { Download, CheckCircle2, Smartphone } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { usePwaStore } from "@/stores/pwa.store";

export function InstallAppCard() {
  const { installPrompt: prompt, setInstallPrompt: setPrompt, installed } = usePwaStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function install() {
    if (!prompt) { setHelpOpen(true); return; }
    setBusy(true);
    try { await prompt.prompt(); await prompt.userChoice; }
    catch { setHelpOpen(true); }
    finally { setPrompt(null); setBusy(false); }
  }

  return <>
    <section className="surface flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Smartphone className="size-6" /></span>
      <div className="min-w-0 flex-1"><h2 className="font-bold">Kavreo di layar utamamu</h2><p className="mt-1 text-sm leading-relaxed text-base-content/65">Buka lebih cepat seperti aplikasi, langsung dari HP, tablet, atau desktop.</p></div>
      {installed ? <span className="flex shrink-0 items-center gap-2 text-sm font-semibold text-success"><CheckCircle2 className="size-5" /> Terpasang</span> :
        <button type="button" className="btn btn-primary shrink-0" disabled={busy} onClick={() => void install()}><Download className="size-4" /> {prompt ? "Pasang Kavreo" : "Cara memasang"}</button>}
    </section>
    <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Pasang Kavreo" footer={<button type="button" className="btn btn-primary" onClick={() => setHelpOpen(false)}>Mengerti</button>}>
      <div className="grid gap-5 text-sm leading-relaxed">
        <div><h3 className="font-bold">Android</h3><p className="mt-1 text-base-content/70">Buka Kavreo di Chrome, lalu menu ⋮ → Pasang aplikasi atau Tambahkan ke layar utama.</p></div>
        <div><h3 className="font-bold">iPhone & iPad</h3><p className="mt-1 text-base-content/70">Buka Kavreo di Safari → Bagikan → Tambahkan ke Layar Utama. Aktifkan Buka sebagai App Web jika tersedia, lalu ketuk Tambah.</p></div>
        <div><h3 className="font-bold">Desktop</h3><p className="mt-1 text-base-content/70">Buka di Chrome atau Edge, lalu pilih ikon instalasi di bilah alamat atau opsi pemasangan dari menu browser.</p></div>
        <p className="rounded-xl bg-primary/5 p-3 text-xs text-base-content/65">Jika dibuka dari Instagram atau WhatsApp, buka dahulu tautannya di browser. Kavreo membutuhkan internet untuk memuat dan menyimpan konten.</p>
      </div>
    </Modal>
  </>;
}
