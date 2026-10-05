import { zodResolver } from "@hookform/resolvers/zod";
import { addDays } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { useCalendar, useCreateCalendar, useUpdateCalendar } from "@/api/calendars";
import { ApprovalAssignment } from "@/components/ui/ApprovalAssignment";
import { useApplicationSettings } from "@/api/settings";
import { Field } from "@/components/ui/Field";
import { ErrorState, PageLoader } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { toISODate } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";

const schema = z
	.object({
		title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160),
		description: z.string().trim().max(3000),
		startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
		endDate: z.string().min(1, "Tanggal selesai wajib diisi"),
		approverIds: z.array(z.string()),
	})
	.refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
		path: ["endDate"],
		message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
	});
type FormValues = z.infer<typeof schema>;

export function CalendarFormPage() {
	const { id } = useParams();
	const isEdit = Boolean(id);
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user)!;

	const existing = useCalendar(id);
	const create = useCreateCalendar();
	const update = useUpdateCalendar(id ?? "");
	const settings = useApplicationSettings();

	const today = new Date();
	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			title: "",
			description: "",
			startDate: toISODate(today),
			endDate: toISODate(addDays(today, 13)),
			approverIds: [],
		},
	});

	const loadedFor = useRef<string | null>(null);
	useEffect(() => {
		if (existing.data && loadedFor.current !== existing.data.id) {
			loadedFor.current = existing.data.id;
			reset({
				title: existing.data.title,
				description: existing.data.description ?? "",
				startDate: existing.data.startDate,
				endDate: existing.data.endDate,
				approverIds: existing.data.approvers.map((a) => a.id),
			});
		}
	}, [existing.data, reset]);

	if (user.role !== "USER") return <Navigate to="/calendars" replace />;
	if (isEdit && existing.isLoading) return <PageLoader />;
	if (isEdit && (existing.error || !existing.data)) return <ErrorState error={existing.error} />;
	if (isEdit && existing.data && !["DRAFT", "REVISION"].includes(existing.data.status)) {
		return <Navigate to={`/calendars/${id}`} replace />;
	}

	const onSubmit = handleSubmit(async (v) => {
		try {
			const payload = { ...v, description: v.description || null };
			if (settings.data?.approvalEnabled === false) payload.approverIds = [];
			const saved = isEdit ? await update.mutateAsync(payload) : await create.mutateAsync(payload);
			toast.success(isEdit ? "Kalender diperbarui" : "Kalender dibuat. Tambahkan jadwal per tanggal.");
			navigate(`/calendars/${saved.id}`);
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	const busy = isSubmitting || create.isPending || update.isPending;

	return (
		<>
			<Link to={isEdit ? `/calendars/${id}` : "/calendars"} className="btn btn-ghost btn-sm -ml-2 mb-2">
				<ArrowLeft className="size-4" /> Kembali
			</Link>
			<PageHeader
				title={isEdit ? "Edit kalender" : "Kalender baru"}
				subtitle="Tentukan periode kalender. Jadwal per tanggal ditambahkan setelah draft kalender dibuat."
			/>

			<form onSubmit={onSubmit} noValidate className="grid max-w-3xl gap-6">
				<section className="surface grid gap-4 p-5 sm:p-6">
					<Field label="Judul kalender" required error={errors.title?.message}>
						<input className="input input-bordered w-full" placeholder="mis. Konten Oktober 2026" {...register("title")} />
					</Field>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Mulai" required error={errors.startDate?.message}>
							<input type="date" className="input input-bordered w-full" {...register("startDate")} />
						</Field>
						<Field label="Selesai" required error={errors.endDate?.message}>
							<input type="date" className="input input-bordered w-full" {...register("endDate")} />
						</Field>
					</div>
					<Field label="Catatan / tema" hint="Opsional — mis. fokus campaign atau target bulanan" error={errors.description?.message}>
						<textarea className="textarea textarea-bordered min-h-24 w-full" {...register("description")} />
					</Field>
				</section>

					<Controller
						control={control}
						name="approverIds"
						render={({ field }) => <ApprovalAssignment value={field.value} onChange={field.onChange} />}
					/>

				<div className="flex gap-2">
					<button className="btn btn-primary" disabled={busy}>
						{busy && <span className="loading loading-spinner loading-sm" />}
						{isEdit ? "Simpan perubahan" : "Buat kalender"}
					</button>
					<Link to={isEdit ? `/calendars/${id}` : "/calendars"} className="btn btn-ghost">
						Batal
					</Link>
				</div>
			</form>
		</>
	);
}
