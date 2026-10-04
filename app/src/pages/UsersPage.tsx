import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Search, Trash2, Users as UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useDeleteUser, useSaveUser, useUsers } from "@/api/users";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { ErrorState, SkeletonList } from "@/components/ui/Loading";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { getErrorMessage } from "@/lib/api";
import { ROLE_LABEL, cn } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { Role, User } from "@/types";

const roleBadge: Record<Role, string> = {
	USER: "badge-ghost",
	APPROVER: "badge-info badge-soft",
	SUPERADMIN: "badge-primary badge-soft",
};

const schema = z.object({
	name: z.string().trim().min(2, "Nama minimal 2 karakter"),
	email: z.email("Email tidak valid"),
	phone: z
		.string()
		.trim()
		.regex(/^(\+?[0-9\s-]{8,20})?$/, "Nomor telepon tidak valid"),
	role: z.enum(["USER", "APPROVER", "SUPERADMIN"]),
	password: z.string(),
	isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

function UserFormModal({ user, open, onClose }: { user: User | null; open: boolean; onClose: () => void }) {
	const save = useSaveUser();
	const isEdit = Boolean(user);
	const {
		register,
		handleSubmit,
		reset,
		setError,
		formState: { errors },
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: { name: "", email: "", phone: "", role: "USER", password: "", isActive: true },
	});

	useEffect(() => {
		if (open) {
			reset(
				user
					? { name: user.name, email: user.email, phone: user.phone ?? "", role: user.role, password: "", isActive: user.isActive }
					: { name: "", email: "", phone: "", role: "USER", password: "", isActive: true },
			);
		}
	}, [open, user, reset]);

	const onSubmit = handleSubmit(async (v) => {
		if (!isEdit && v.password.length < 8) {
			setError("password", { message: "Password minimal 8 karakter" });
			return;
		}
		if (isEdit && v.password && v.password.length < 8) {
			setError("password", { message: "Password minimal 8 karakter" });
			return;
		}
		try {
			await save.mutateAsync({
				id: user?.id,
				name: v.name,
				email: v.email,
				phone: v.phone || (isEdit ? null : undefined),
				role: v.role,
				isActive: v.isActive,
				password: v.password || undefined,
			});
			toast.success(isEdit ? "Pengguna diperbarui" : "Pengguna dibuat");
			onClose();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	return (
		<Modal
			open={open}
			onClose={onClose}
			title={isEdit ? "Edit pengguna" : "Tambah pengguna"}
			footer={
				<>
					<button className="btn btn-ghost" onClick={onClose} type="button">
						Batal
					</button>
					<button className="btn btn-primary" form="user-form" disabled={save.isPending}>
						{save.isPending && <span className="loading loading-spinner loading-sm" />}
						Simpan
					</button>
				</>
			}
		>
			<form id="user-form" onSubmit={onSubmit} className="grid gap-4" noValidate>
				<Field label="Nama" required error={errors.name?.message}>
					<input className="input input-bordered w-full" {...register("name")} />
				</Field>
				<Field label="Email" required error={errors.email?.message}>
					<input type="email" className="input input-bordered w-full" {...register("email")} />
				</Field>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Role" required>
						<select className="select select-bordered w-full" {...register("role")}>
							<option value="USER">User</option>
							<option value="APPROVER">Approval</option>
							<option value="SUPERADMIN">Superadmin</option>
						</select>
					</Field>
					<Field label="No. WhatsApp" error={errors.phone?.message}>
						<input type="tel" className="input input-bordered w-full" {...register("phone")} />
					</Field>
				</div>
				<Field
					label={isEdit ? "Password baru" : "Password"}
					required={!isEdit}
					hint={isEdit ? "Kosongkan jika tidak ingin mengubah" : "Minimal 8 karakter"}
					error={errors.password?.message}
				>
					<input type="password" autoComplete="new-password" className="input input-bordered w-full" {...register("password")} />
				</Field>
				<label className="flex cursor-pointer items-center justify-between rounded-xl bg-base-200 px-4 py-3">
					<span className="text-sm font-semibold">Akun aktif</span>
					<input type="checkbox" className="toggle toggle-primary" {...register("isActive")} />
				</label>
			</form>
		</Modal>
	);
}

export function UsersPage() {
	const me = useAuthStore((s) => s.user)!;
	const [q, setQ] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [role, setRole] = useState<Role | "">("");
	const [page, setPage] = useState(1);
	const [editing, setEditing] = useState<User | null>(null);
	const [formOpen, setFormOpen] = useState(false);
	const [toDelete, setToDelete] = useState<User | null>(null);

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedQ(q);
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [q]);

	const { data, isLoading, error, refetch } = useUsers({ q: debouncedQ || undefined, role, page, pageSize: 10 });
	const del = useDeleteUser();

	return (
		<>
			<PageHeader
				title="Pengguna"
				subtitle="Kelola akun User, Approval, dan Superadmin."
				actions={
					<button
						className="btn btn-primary"
						onClick={() => {
							setEditing(null);
							setFormOpen(true);
						}}
					>
						<Plus className="size-4" /> Tambah pengguna
					</button>
				}
			/>

			<div className="mb-4 flex flex-col gap-2 sm:flex-row">
				<label className="input input-bordered flex flex-1 items-center gap-2">
					<Search className="size-4 text-base-content/50" aria-hidden />
					<input type="search" className="grow" placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} />
				</label>
				<select
					className="select select-bordered sm:w-48"
					value={role}
					aria-label="Filter role"
					onChange={(e) => {
						setRole(e.target.value as Role | "");
						setPage(1);
					}}
				>
					<option value="">Semua role</option>
					<option value="USER">User</option>
					<option value="APPROVER">Approval</option>
					<option value="SUPERADMIN">Superadmin</option>
				</select>
			</div>

			{isLoading ? (
				<SkeletonList rows={5} />
			) : error ? (
				<ErrorState error={error} onRetry={() => void refetch()} />
			) : !data || data.data.length === 0 ? (
				<EmptyState icon={UsersIcon} title="Pengguna tidak ditemukan" description="Coba ubah kata kunci atau filter role." />
			) : (
				<>
					<ul className="surface divide-y divide-base-300 overflow-hidden">
						{data.data.map((u) => (
							<li key={u.id} className="flex items-center gap-3 px-4 py-3.5">
								<Avatar name={u.name} />
								<div className="min-w-0 flex-1">
									<p className="flex flex-wrap items-center gap-2">
										<b className="truncate text-sm">{u.name}</b>
										<span className={cn("badge badge-sm", roleBadge[u.role])}>{ROLE_LABEL[u.role]}</span>
										{!u.isActive && <span className="badge badge-sm badge-error badge-soft">Nonaktif</span>}
									</p>
									<p className="truncate text-xs text-base-content/55">
										{u.email}
										{u.phone && ` · ${u.phone}`}
									</p>
								</div>
								<div className="flex gap-1">
									<button
										className="btn btn-ghost btn-sm btn-square"
										aria-label={`Edit ${u.name}`}
										onClick={() => {
											setEditing(u);
											setFormOpen(true);
										}}
									>
										<Pencil className="size-4" />
									</button>
									<button
										className="btn btn-ghost btn-sm btn-square text-error"
										aria-label={`Hapus ${u.name}`}
										disabled={u.id === me.id}
										onClick={() => setToDelete(u)}
									>
										<Trash2 className="size-4" />
									</button>
								</div>
							</li>
						))}
					</ul>
					<Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
				</>
			)}

			<UserFormModal user={editing} open={formOpen} onClose={() => setFormOpen(false)} />

			<ConfirmDialog
				open={Boolean(toDelete)}
				danger
				loading={del.isPending}
				title="Hapus pengguna?"
				message={`Akun ${toDelete?.name ?? ""} beserta seluruh script, ide, dan kalender miliknya akan dihapus permanen. Untuk menonaktifkan sementara, gunakan opsi "Akun aktif" saat edit.`}
				confirmLabel="Hapus permanen"
				onClose={() => setToDelete(null)}
				onConfirm={async () => {
					if (!toDelete) return;
					try {
						await del.mutateAsync(toDelete.id);
						toast.success("Pengguna dihapus");
						setToDelete(null);
					} catch (err) {
						toast.error(getErrorMessage(err));
					}
				}}
			/>
		</>
	);
}
