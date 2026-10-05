import { useState } from "react";
import { toast } from "sonner";
import { useApplicationSettings, useUpdateApplicationSettings } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";

export function ApplicationApprovalSettings() {
  const settings = useApplicationSettings();
  const update = useUpdateApplicationSettings();
  const [choice, setChoice] = useState<boolean>();
  const enabled = choice ?? settings.data?.approvalEnabled ?? true;
  async function save() {
    try {
      await update.mutateAsync(enabled);
      setChoice(undefined);
      toast.success(enabled ? "Approval diaktifkan" : "Approval dinonaktifkan. Pengajuan berikutnya langsung disetujui.");
    } catch (error) { toast.error(getErrorMessage(error)); }
  }
  return <section className="surface grid gap-4 p-5 sm:p-6">
    <div><h2 className="font-bold">Alur approval aplikasi</h2><p className="mt-1 text-sm text-base-content/60">Berlaku untuk script, ide, dan kalender seluruh pengguna.</p></div>
    {settings.isPending ? <span className="loading loading-spinner loading-sm" /> : settings.isError ?
      <div role="alert" className="text-sm text-error">{getErrorMessage(settings.error)} <button className="btn btn-ghost btn-sm" onClick={() => void settings.refetch()}>Coba lagi</button></div> : <>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl bg-base-200 p-4">
          <span className="min-w-0"><span className="block text-sm font-semibold">Wajib approval</span><span className="mt-1 block text-xs text-base-content/65">{enabled ? "Pengajuan harus memilih approver dan menunggu review." : "Pengajuan langsung disetujui tanpa memilih approver."}</span></span>
          <input type="checkbox" className="toggle toggle-primary shrink-0" checked={enabled} disabled={update.isPending} onChange={(event) => setChoice(event.target.checked)} />
        </label>
        <p className="text-xs leading-relaxed text-base-content/60">Draft selalu boleh disimpan tanpa approver. Perubahan berlaku pada pengajuan berikutnya; data yang sudah menunggu review tetap diproses seperti sebelumnya.</p>
        <div><button className="btn btn-primary" disabled={update.isPending || choice === undefined || enabled === settings.data.approvalEnabled} onClick={() => void save()}>{update.isPending && <span className="loading loading-spinner loading-sm" />}Simpan pengaturan approval</button></div>
      </>}
  </section>;
}
