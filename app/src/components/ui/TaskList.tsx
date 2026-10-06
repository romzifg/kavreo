import { Link } from "react-router";
import { useState } from "react";
import { useTasks, type WorkTask } from "@/api/tasks";
import { useAuthStore } from "@/stores/auth.store";
import { TYPE_BASE_PATH } from "@/lib/format";
import { ErrorState } from "./Loading";
import { Pagination } from "./Pagination";
export const TASK_STATUS: Record<string, string> = {
  TODO: "Belum dikerjakan",
  IN_PROGRESS: "Sedang dikerjakan",
  SUBMITTED: "Menunggu review",
  REVISION: "Perlu revisi",
  APPROVED: "Selesai"
};
export const deadlineText = (v: string) => new Date(v).toLocaleString("id-ID", {
  dateStyle: "medium",
  timeStyle: "short"
});
export function TaskList({
  compact = false,
  onEdit
}: {
  compact?: boolean;
  onEdit?: (task: WorkTask) => void;
}) {
  const [status, setStatus] = useState("ACTIVE"),
    [page, setPage] = useState(1),
    user = useAuthStore(s => s.user)!;
  const query = useTasks(status, page, compact ? 5 : 12);
  return <section className="surface mb-6 min-w-0 p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{user.role === "USER" ? "Pekerjaan untukmu" : "Penugasan pekerjaan"}</h2>{compact ? <Link to="/tasks" className="btn btn-sm btn-outline">{user.role === "APPROVER" ? "Assign pekerjaan" : "Lihat semua task"}</Link> : <label className="grid gap-1 text-xs">Status pekerjaan<select className="select select-sm w-full sm:w-56" value={status} onChange={e => {
          setStatus(e.target.value);
          setPage(1);
        }}><option value="ACTIVE">Semua yang belum selesai</option><option value="OVERDUE">Melewati deadline</option>{Object.entries(TASK_STATUS).map(([v, t]) => <option key={v} value={v}>{t}</option>)}<option value="ALL">Semua pekerjaan</option></select></label>}</div>
 {query.isLoading ? <span className="loading loading-spinner" /> : query.error ? <ErrorState error={query.error} onRetry={() => void query.refetch()} /> : <><p className="mb-3 text-xs text-base-content/60">{query.data?.meta.total ?? 0} pekerjaan · urutan deadline terdekat</p><ul className="grid gap-3">{query.data?.data.map(t => <li key={t.id} className={`min-w-0 rounded-2xl border p-4 ${t.overdue ? "border-error/30 bg-error/5" : "border-base-300 bg-base-200/30"}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="badge badge-sm badge-outline">{t.content.type === "SCRIPT" ? "Script video" : "Ide konten"}</span><span className={`badge badge-sm ${t.status === "APPROVED" ? "badge-success" : t.status === "REVISION" ? "badge-warning" : "badge-ghost"}`}>{TASK_STATUS[t.status]}</span></div><h3 className="mt-3 break-words font-bold">{t.title}</h3><p className="mt-1 break-words text-xs text-base-content/65">{user.role === "USER" ? `Dari ${t.assigner.name}` : `Untuk ${t.assignee.name} · ${t.assigner.name}`}</p><p className={`mt-2 text-sm ${t.overdue ? "font-semibold text-error" : "text-base-content/70"}`}>Deadline: {deadlineText(t.deadline)}{t.overdue ? " · Terlambat" : ""}</p><details className="mt-3 text-sm"><summary className="cursor-pointer text-primary">Lihat brief</summary><p className="mt-2 whitespace-pre-wrap break-words text-base-content/75 [overflow-wrap:anywhere]">{t.brief}</p></details><div className="mt-4 flex flex-wrap gap-2">{user.role === "USER" ? <Link className="btn btn-sm btn-primary" to={`${TYPE_BASE_PATH[t.content.type]}/${t.content.id}${["DRAFT", "REVISION"].includes(t.content.status) ? "/edit" : ""}`}>{t.status === "TODO" ? "Kerjakan" : t.status === "REVISION" ? "Perbaiki" : t.status === "IN_PROGRESS" ? "Lanjutkan" : "Lihat hasil"}</Link> : <>{t.content.status !== "DRAFT" && <Link className="btn btn-sm btn-primary" to={`${TYPE_BASE_PATH[t.content.type]}/${t.content.id}`}>{t.status === "SUBMITTED" ? "Review hasil" : "Lihat hasil"}</Link>}{user.role === "APPROVER" && t.status !== "APPROVED" && onEdit && <button className="btn btn-sm btn-outline" onClick={() => onEdit(t)}>Ubah brief / deadline</button>}</>}</div></li>)}</ul>{!query.data?.data.length && <p className="py-6 text-center text-sm text-base-content/60">Belum ada pekerjaan pada status ini.</p>}{!compact && query.data && <Pagination page={page} totalPages={query.data.meta.totalPages} onChange={setPage} />}</>}
 </section>;
}
