import { useState } from "react";
import { toast } from "sonner";
import { useAssignees, useSaveTask, type TaskInput, type WorkTask } from "@/api/tasks";
import { TaskList } from "@/components/ui/TaskList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { useAuthStore } from "@/stores/auth.store";
import { getErrorMessage } from "@/lib/api";
import { PLATFORMS, PLATFORM_LABEL } from "@/lib/format";
const empty: TaskInput = {
  title: "",
  brief: "",
  deadline: "",
  assigneeId: "",
  type: "SCRIPT",
  platform: "TIKTOK"
};
export function TasksPage() {
  const user = useAuthStore(s => s.user)!,
    assigner = user.role === "APPROVER",
    users = useAssignees(assigner),
    save = useSaveTask();
  const [open, setOpen] = useState(false),
    [editing, setEditing] = useState<string>(),
    [form, setForm] = useState<TaskInput>(empty),
    [error, setError] = useState("");
  function edit(t: WorkTask) {
    const date = new Date(t.deadline);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    setForm({
      title: t.title,
      brief: t.brief,
      deadline: date.toISOString().slice(0, 16),
      assigneeId: t.assignee.id,
      type: t.content.type,
      platform: t.content.platform
    });
    setEditing(t.id);
    setError("");
    setOpen(true);
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const deadline = String(new FormData(e.currentTarget).get("deadline") ?? "");
    if (!deadline || !Number.isFinite(new Date(deadline).getTime()) || new Date(deadline) <= new Date()) {
      setError("Deadline harus di masa depan");
      return;
    }
    try {
      await save.mutateAsync({
        ...form,
        deadline: new Date(deadline).toISOString(),
        id: editing
      });
      setOpen(false);
      toast.success(editing ? "Penugasan diperbarui" : "Pekerjaan berhasil ditugaskan");
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }
  return <><PageHeader title={assigner ? "Assign pekerjaan" : "Daftar pekerjaan"} subtitle={assigner ? "Berikan brief dan deadline. Hasil pekerjaan diajukan kepadamu untuk review." : "Pantau brief, deadline, dan progres script atau ide yang ditugaskan."} actions={assigner && <button className="btn btn-primary" onClick={() => {
      setForm(empty);
      setEditing(undefined);
      setError("");
      setOpen(true);
    }}>Assign pekerjaan baru</button>} /><TaskList onEdit={edit} /><Modal open={open} onClose={() => {
      if (!save.isPending) setOpen(false);
    }} title={editing ? "Ubah penugasan" : "Assign pekerjaan baru"}><form className="grid gap-4" onSubmit={submit}><Field label="Judul pekerjaan" required><input className="input w-full" required minLength={3} maxLength={160} value={form.title} onChange={e => setForm({
            ...form,
            title: e.target.value
          })} /></Field>{!editing && <><Field label="User penerima" required><select className="select w-full" required value={form.assigneeId} onChange={e => setForm({
              ...form,
              assigneeId: e.target.value
            })}><option value="">Pilih user aktif</option>{users.data?.map(u => <option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select>{users.isError && <p className="text-sm text-error">Daftar user gagal dimuat. <button type="button" className="link" onClick={() => void users.refetch()}>Coba lagi</button></p>}</Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Jenis pekerjaan"><select className="select w-full" value={form.type} onChange={e => setForm({
                ...form,
                type: e.target.value as TaskInput["type"]
              })}><option value="SCRIPT">Script video</option><option value="IDEA">Ide konten</option></select></Field><Field label="Platform"><select className="select w-full" value={form.platform} onChange={e => setForm({
                ...form,
                platform: e.target.value as TaskInput["platform"]
              })}>{PLATFORMS.map(p => <option value={p} key={p}>{PLATFORM_LABEL[p]}</option>)}</select></Field></div></>}<Field label="Brief pekerjaan" required><textarea className="textarea min-h-32 w-full" required minLength={3} maxLength={5000} value={form.brief} onChange={e => setForm({
            ...form,
            brief: e.target.value
          })} /></Field><Field label="Deadline" required hint="Waktu mengikuti zona waktu perangkatmu."><input className="input w-full" name="deadline" type="datetime-local" required defaultValue={form.deadline} /></Field><p className="text-xs text-base-content/60">Reviewer dikunci kepada pemberi tugas. Jika approval global nonaktif, pengajuan langsung disetujui sesuai pengaturan aplikasi.</p>{error && <p role="alert" className="text-sm text-error">{error}</p>}<button type="submit" className="btn btn-primary" disabled={save.isPending || !editing && !users.data?.length}>{save.isPending ? <span className="loading loading-spinner loading-sm" /> : editing ? "Simpan penugasan" : "Assign pekerjaan"}</button></form></Modal></>;
}
