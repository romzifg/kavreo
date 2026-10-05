import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAiSettings, useSaveAiSettings, useTestAi, type AiSettings } from "@/api/ai";
import { getErrorMessage } from "@/lib/api";
import { Field } from "./Field";
import { Link } from "react-router";

export function AiSettingsCard() {
  const query = useAiSettings(), save = useSaveAiSettings(), test = useTestAi();
  const [form, setForm] = useState<AiSettings>(), [apiKey, setApiKey] = useState(""), [clearApiKey, setClearApiKey] = useState(false), [dirty, setDirty] = useState(false);
  useEffect(() => { if (query.data && !dirty) setForm(query.data); }, [query.data, dirty]);
  function change<K extends keyof AiSettings>(key: K, value: AiSettings[K]) { setForm((current) => current && { ...current, [key]: value }); setDirty(true); }
  async function submit() {
    if (!form) return;
    try {
      const { hasApiKey: _hasApiKey, ...values } = form;
      await save.mutateAsync({ ...values, apiKey: apiKey || undefined, clearApiKey });
      setApiKey(""); setClearApiKey(false); setDirty(false); test.reset(); toast.success("Pengaturan AI tersimpan");
    } catch (error) { toast.error(getErrorMessage(error)); }
  }
  return <section className="surface grid gap-4 p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">Bantuan AI</h2><Link to="/ai-usage" className="link text-sm text-primary">Dashboard pemakaian AI</Link></div>
    {query.isError ? <p role="alert" className="text-error">{getErrorMessage(query.error)} <button className="btn btn-sm" onClick={() => void query.refetch()}>Coba lagi</button></p> : !form ? <span className="loading loading-spinner" /> : <>
      <label className="flex items-center justify-between gap-3 rounded-xl bg-base-200 p-4"><span className="text-sm font-semibold">Aktifkan bantuan AI untuk pengguna</span><input type="checkbox" className="toggle toggle-primary shrink-0" checked={form.enabled} onChange={(e) => change("enabled", e.target.checked)} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Protokol penyedia"><select className="select w-full" value={form.protocol} onChange={(e) => change("protocol", e.target.value as AiSettings["protocol"])}><option value="OLLAMA">Ollama lokal</option><option value="OPENAI_COMPATIBLE">OpenAI compatible / gateway</option><option value="ANTHROPIC">Anthropic / Claude</option></select></Field>
        <Field label="Nama penyedia"><input className="input w-full" maxLength={80} value={form.providerName} onChange={(e) => change("providerName", e.target.value)} /></Field>
      </div>
      <Field label="Base URL" hint={form.protocol === "OLLAMA" ? "Contoh: http://localhost:11434. Alamat ini diakses oleh backend." : form.protocol === "ANTHROPIC" ? "Contoh: https://api.anthropic.com/v1" : "Contoh: https://api.openai.com/v1 atau https://generativelanguage.googleapis.com/v1beta/openai"}><input type="url" className="input w-full" value={form.baseUrl} onChange={(e) => change("baseUrl", e.target.value)} /></Field>
      <Field label="Nama model" hint="Nama harus sesuai dengan model yang tersedia di penyedia. Ollama lokal: llama3:latest atau mistral:latest."><input className="input w-full" value={form.model} onChange={(e) => change("model", e.target.value)} /></Field>
      <Field label="API key" hint={form.hasApiKey ? "Key tersimpan terenkripsi. Kosongkan untuk mempertahankan; saat URL/protokol berubah, isi key baru." : "Ollama lokal tidak membutuhkan API key. API cloud menggunakan key dari penyedia."}><input type="password" autoComplete="new-password" className="input w-full" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setDirty(true); }} placeholder={form.hasApiKey ? "•••••••• (tersimpan)" : "Masukkan API key jika diperlukan"} /></Field>
      {form.hasApiKey && <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="checkbox checkbox-sm" checked={clearApiKey} onChange={(e) => { setClearApiKey(e.target.checked); setDirty(true); }} />Hapus key tersimpan saat menyimpan</label>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Kuota per user / hari"><input type="number" className="input w-full" min={1} max={1000} value={form.dailyLimit} onChange={(e) => change("dailyLimit", Number(e.target.value))} /></Field>
        <Field label="Batas output token"><input type="number" className="input w-full" min={64} max={2000} value={form.maxTokens} onChange={(e) => change("maxTokens", Number(e.target.value))} /></Field>
        <Field label="Timeout (detik)"><input type="number" className="input w-full" min={10} max={300} value={form.timeoutSec} onChange={(e) => change("timeoutSec", Number(e.target.value))} /></Field>
      </div>
      {form.protocol !== "OLLAMA" && <div className="grid gap-4 sm:grid-cols-2"><Field label="Harga input USD / 1 juta token"><input type="number" className="input w-full" min={0} step="0.001" value={form.inputPrice} onChange={(e) => change("inputPrice", Number(e.target.value))} /></Field><Field label="Harga output USD / 1 juta token"><input type="number" className="input w-full" min={0} step="0.001" value={form.outputPrice} onChange={(e) => change("outputPrice", Number(e.target.value))} /></Field></div>}
      <p className="text-xs leading-relaxed text-base-content/60">Ollama lokal tercatat dengan biaya API USD 0; biaya perangkat/listrik tidak dihitung. Biaya cloud adalah estimasi dari harga yang kamu isi. Protokol lain dapat dihubungkan melalui gateway kompatibel OpenAI. Kuota dihitung per permintaan, termasuk gagal, dan direset 00.00 UTC.</p>
      <div className="flex flex-wrap gap-2"><button type="button" className="btn btn-primary" disabled={!dirty || save.isPending || test.isPending} onClick={() => void submit()}>{save.isPending && <span className="loading loading-spinner loading-sm" />}Simpan pengaturan AI</button><button type="button" className="btn btn-outline" disabled={dirty || save.isPending || test.isPending} onClick={() => test.mutate()}>{test.isPending && <span className="loading loading-spinner loading-sm" />}Uji koneksi & model</button></div>
      <p className="text-xs text-base-content/60">Simpan dahulu sebelum menguji. Pengujian menghasilkan teks singkat dan dicatat pada dashboard.</p>
      {test.data && <p role="status" className="rounded-xl bg-success/10 p-3 text-sm">{test.data.message}: {test.data.text}</p>}
      {test.error && <p role="alert" className="rounded-xl bg-error/10 p-3 text-sm text-error">{getErrorMessage(test.error)}</p>}
    </>}
  </section>;
}
