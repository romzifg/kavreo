import { useApplicationSettings } from "@/api/settings";
import { getErrorMessage } from "@/lib/api";
import { ApproverPicker } from "./ApproverPicker";

export function ApprovalAssignment({ value, onChange, error }: { value: string[]; onChange: (ids: string[]) => void; error?: string }) {
  const settings = useApplicationSettings();
  return <section className="surface grid gap-3 p-5">
    <div>
      <h2 className="font-bold">Approval {settings.data?.approvalEnabled && <span className="text-error">*</span>}</h2>
      <p className="mt-1 text-xs leading-relaxed text-base-content/60">
        {settings.data?.approvalEnabled === false
          ? "Approval nonaktif. Saat diajukan, konten langsung disetujui. Draft tetap bisa disimpan."
          : "Pilih minimal satu approver saat mengajukan. Untuk menyimpan draft, approver boleh kosong."}
      </p>
    </div>
    {settings.isPending ? <span className="loading loading-spinner loading-sm" /> : settings.isError ?
      <div className="text-sm text-error" role="alert">{getErrorMessage(settings.error)} <button type="button" className="btn btn-ghost btn-sm" onClick={() => void settings.refetch()}>Coba lagi</button></div> :
      settings.data.approvalEnabled && <ApproverPicker value={value} onChange={(ids) => onChange(ids)} />}
    {error && settings.data?.approvalEnabled && <p className="text-sm text-error" role="alert">{error}</p>}
  </section>;
}
