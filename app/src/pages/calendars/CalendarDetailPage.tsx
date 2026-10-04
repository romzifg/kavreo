import { zodResolver } from "@hookform/resolvers/zod";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { ArrowLeft, CalendarDays, Check, CheckCheck, LayoutGrid, List, Pencil, Plus, RotateCcw, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import {
	useAddCalendarComment,
	useAddItem,
	useApproveAll,
	useCalendar,
	useDeleteCalendar,
	useDeleteItem,
	useReviewItem,
	useSubmitCalendar,
	useUpdateItem,
} from "@/api/calendars";
import { useContents } from "@/api/contents";
import { ActivityTimeline, CommentBox } from "@/components/ui/ActivityTimeline";
import { Avatar } from "@/components/ui/Avatar";
import { Field } from "@/components/ui/Field";
import { ErrorState, PageLoader } from "@/components/ui/Loading";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { ItemStatusBadge, StatusBadge } from "@/components/ui/StatusBadge";
import { getErrorMessage } from "@/lib/api";
import { PLATFORMS, PLATFORM_LABEL, PLATFORM_SHORT, TYPE_BASE_PATH, cn, formatDate, toDate, toISODate } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { Calendar, CalendarItem, ItemStatus } from "@/types";

const chipBorder: Record<ItemStatus, string> = {
	DRAFT: "border-base-content/25",
	PENDING: "border-info",
	APPROVED: "border-success",
	REJECTED: "border-error",
};

const itemSchema = z.object({
	date: z.string().min(1, "Tanggal wajib diisi"),
	title: z.string().trim().min(2, "Judul minimal 2 karakter").max(160),
	platform: z.enum(["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS", "FACEBOOK_REELS", "OTHER"]),
	format: z.string().trim().max(60),
	notes: z.string().trim().max(2000),
	contentId: z.string(),
});
type ItemForm = z.infer<typeof itemSchema>;

/* ───────────────────────── Form tambah / edit jadwal ───────────────────────── */

function ItemEditor({
	calendar,
	item,
	initialDate,
	onDone,
}: {
	calendar: Calendar;
	item: CalendarItem | null;
	initialDate: string;
	onDone: () => void;
}) {
	const add = useAddItem(calendar.id);
	const update = useUpdateItem(calendar.id);
	const del = useDeleteItem(calendar.id);
	const contents = useContents({ pageSize: 100 });
	const [confirmDelete, setConfirmDelete] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<ItemForm>({
		resolver: zodResolver(itemSchema),
		defaultValues: {
			date: item?.date ?? initialDate,
			title: item?.title ?? "",
			platform: item?.platform ?? "TIKTOK",
			format: item?.format ?? "",
			notes: item?.notes ?? "",
			contentId: item?.contentId ?? "",
		},
	});

	const onSubmit = handleSubmit(async (v) => {
		if (v.date < calendar.startDate || v.date > calendar.endDate) {
			toast.error("Tanggal harus berada di dalam periode kalender");
			return;
		}
		const payload = {
			date: v.date,
			title: v.title,
			platform: v.platform,
			format: v.format || null,
			notes: v.notes || null,
			contentId: v.contentId || null,
		};
		try {
			if (item) await update.mutateAsync({ itemId: item.id, ...payload });
			else await add.mutateAsync(payload);
			toast.success(item ? "Jadwal diperbarui" : "Jadwal ditambahkan");
			onDone();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	});

	const busy = add.isPending || update.isPending;

	return (
		<>
			{item?.status === "REJECTED" && item.reviewNote && (
				<div role="alert" className="mb-4 rounded-xl border border-error/30 bg-error/10 p-3 text-sm">
					<p className="font-bold text-error">Ditolak{item.reviewedBy ? ` oleh ${item.reviewedBy.name}` : ""}</p>
					<p className="mt-1 whitespace-pre-wrap">{item.reviewNote}</p>
				</div>
			)}
			<form id="item-form" onSubmit={onSubmit} noValidate className="grid gap-4">
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Tanggal tayang" required error={errors.date?.message}>
						<input
							type="date"
							min={calendar.startDate}
							max={calendar.endDate}
							className="input input-bordered w-full"
							{...register("date")}
						/>
					</Field>
					<Field label="Platform">
						<select className="select select-bordered w-full" {...register("platform")}>
							{PLATFORMS.map((p) => (
								<option key={p} value={p}>
									{PLATFORM_LABEL[p]}
								</option>
							))}
						</select>
					</Field>
				</div>
				<Field label="Judul / topik konten" required error={errors.title?.message}>
					<input className="input input-bordered w-full" {...register("title")} />
				</Field>
				<Field label="Format" hint="mis. Video 30 detik, Carousel, Live">
					<input className="input input-bordered w-full" {...register("format")} />
				</Field>
				<Field label="Tautkan script / ide (opsional)">
					<select className="select select-bordered w-full" {...register("contentId")}>
						<option value="">— Tidak ditautkan —</option>
						{contents.data?.data.map((c) => (
							<option key={c.id} value={c.id}>
								[{c.type === "SCRIPT" ? "Script" : "Ide"}] {c.title}
							</option>
						))}
					</select>
				</Field>
				<Field label="Catatan untuk approval" error={errors.notes?.message}>
					<textarea className="textarea textarea-bordered min-h-20 w-full" {...register("notes")} />
				</Field>
			</form>

			<div className="mt-5 flex items-center justify-between gap-2">
				{item ? (
					<button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => setConfirmDelete(true)}>
						<Trash2 className="size-4" /> Hapus
					</button>
				) : (
					<span />
				)}
				<div className="flex gap-2">
					<button type="button" className="btn btn-ghost" onClick={onDone}>
						Batal
					</button>
					<button className="btn btn-primary" form="item-form" disabled={busy}>
						{busy && <span className="loading loading-spinner loading-sm" />}
						Simpan
					</button>
				</div>
			</div>

			<ConfirmDialog
				open={confirmDelete}
				danger
				loading={del.isPending}
				title="Hapus jadwal ini?"
				message="Jadwal pada tanggal ini akan dihapus dari kalender."
				confirmLabel="Hapus"
				onClose={() => setConfirmDelete(false)}
				onConfirm={async () => {
					if (!item) return;
					try {
						await del.mutateAsync(item.id);
						toast.success("Jadwal dihapus");
						setConfirmDelete(false);
						onDone();
					} catch (err) {
						toast.error(getErrorMessage(err));
					}
				}}
			/>
		</>
	);
}

/* ─────────────────── Tampilan jadwal + review per tanggal ─────────────────── */

function ItemViewer({
	calendar,
	item,
	canReview,
	canComment,
	onDone,
}: {
	calendar: Calendar;
	item: CalendarItem;
	canReview: boolean;
	canComment: boolean;
	onDone: () => void;
}) {
	const review = useReviewItem(calendar.id);
	const addComment = useAddCalendarComment(calendar.id);
	const [note, setNote] = useState("");

	const comments = (calendar.comments ?? []).filter((c) => c.item?.id === item.id);

	async function decide(action: "APPROVE" | "REJECT") {
		if (action === "REJECT" && note.trim().length < 3) {
			toast.error("Tulis catatan penolakan untuk tanggal ini");
			return;
		}
		try {
			await review.mutateAsync({ itemId: item.id, action, note: note.trim() || undefined });
			toast.success(action === "APPROVE" ? "Tanggal disetujui" : "Tanggal ditolak, kembali ke user");
			setNote("");
			onDone();
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	return (
		<div className="grid gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<ItemStatusBadge status={item.status} />
				<span className="badge badge-outline badge-sm">{PLATFORM_LABEL[item.platform]}</span>
				{item.format && <span className="badge badge-ghost badge-sm">{item.format}</span>}
			</div>
			<div>
				<p className="text-xs font-semibold uppercase tracking-wide text-base-content/50">{formatDate(item.date, "EEEE, d MMMM yyyy")}</p>
				<h3 className="mt-1 text-xl font-extrabold leading-snug">{item.title}</h3>
			</div>
			{item.notes && <p className="whitespace-pre-wrap rounded-xl bg-base-200 p-3 text-sm">{item.notes}</p>}
			{item.content && (
				<Link
					to={`${TYPE_BASE_PATH[item.content.type]}/${item.content.id}`}
					className="flex items-center gap-2 rounded-xl border border-base-300 p-3 text-sm hover:border-primary/40"
				>
					<span className="badge badge-primary badge-soft badge-sm">{item.content.type === "SCRIPT" ? "Script" : "Ide"}</span>
					<span className="min-w-0 flex-1 truncate font-semibold">{item.content.title}</span>
				</Link>
			)}

			{item.reviewNote && (item.status === "REJECTED" || item.status === "APPROVED") && (
				<div
					className={cn(
						"rounded-xl border p-3 text-sm",
						item.status === "REJECTED" ? "border-error/30 bg-error/10" : "border-success/30 bg-success/10",
					)}
				>
					<p className="font-bold">Catatan {item.reviewedBy ? `dari ${item.reviewedBy.name}` : "approval"}</p>
					<p className="mt-1 whitespace-pre-wrap">{item.reviewNote}</p>
				</div>
			)}

			{canReview && (
				<div className="grid gap-3 rounded-xl border border-primary/30 p-4">
					<p className="text-sm font-bold">Keputusan untuk tanggal ini</p>
					<textarea
						className="textarea textarea-bordered w-full"
						rows={3}
						placeholder="Catatan (wajib jika ditolak)"
						value={note}
						onChange={(e) => setNote(e.target.value)}
					/>
					<div className="grid grid-cols-2 gap-2">
						<button className="btn btn-success" disabled={review.isPending} onClick={() => void decide("APPROVE")}>
							<Check className="size-4" /> Setujui
						</button>
						<button className="btn btn-error btn-outline" disabled={review.isPending} onClick={() => void decide("REJECT")}>
							<RotateCcw className="size-4" /> Tolak
						</button>
					</div>
				</div>
			)}

			<div className="grid gap-3 border-t border-base-300 pt-4">
				<h4 className="text-sm font-bold">Diskusi tanggal ini</h4>
				<ActivityTimeline
					entries={comments.map((c) => ({
						id: c.id,
						action: c.action,
						message: c.message,
						round: c.round,
						createdAt: c.createdAt,
						author: c.author,
					}))}
				/>
				{canComment && (
					<CommentBox
						placeholder="Tulis komentar untuk tanggal ini…"
						onSend={(message) => addComment.mutateAsync({ message, itemId: item.id })}
					/>
				)}
			</div>
		</div>
	);
}

/* ─────────────────────────────── Grid bulanan ─────────────────────────────── */

function MonthGrid({
	month,
	calendar,
	byDate,
	canAdd,
	onAdd,
	onOpen,
}: {
	month: Date;
	calendar: Calendar;
	byDate: Map<string, CalendarItem[]>;
	canAdd: boolean;
	onAdd: (date: string) => void;
	onOpen: (item: CalendarItem) => void;
}) {
	const days = eachDayOfInterval({
		start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
		end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
	});
	const todayIso = toISODate(new Date());

	return (
		<section className="surface overflow-hidden">
			<h3 className="border-b border-base-300 px-4 py-3 font-bold capitalize">{format(month, "MMMM yyyy", { locale: idLocale })}</h3>
			<div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Kalender bulanan, geser untuk melihat seluruh tanggal">
			<div className="min-w-[630px]">
			<div className="grid grid-cols-7 border-b border-base-300 bg-base-200/60 text-center text-xs font-semibold text-base-content/60">
				{["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
					<div key={d} className="py-2">
						{d}
					</div>
				))}
			</div>
			<div className="grid grid-cols-7">
				{days.map((d) => {
					const iso = toISODate(d);
					const inMonth = isSameMonth(d, month);
					const inRange = iso >= calendar.startDate && iso <= calendar.endDate;
					const items = byDate.get(iso) ?? [];
					const clickable = canAdd && inRange;
					return (
						<div
							key={iso}
							className={cn(
								"min-h-24 min-w-0 border-b border-r border-base-300/70 p-1.5 last:border-r-0 nth-[7n]:border-r-0",
								!inMonth && "bg-base-200/50 opacity-40",
								inMonth && !inRange && "bg-base-200/40",
							)}
						>
							<div className="flex items-center justify-between">
								<span
									className={cn(
										"grid size-6 place-items-center rounded-full text-xs font-semibold",
										iso === todayIso && "bg-primary text-primary-content",
									)}
								>
									{format(d, "d")}
								</span>
								{clickable && inMonth && (
									<button
										className="btn btn-ghost btn-sm btn-circle opacity-60 hover:opacity-100"
										onClick={() => onAdd(iso)}
										aria-label={`Tambah jadwal ${formatDate(iso)}`}
									>
										<Plus className="size-3.5" />
									</button>
								)}
							</div>
							<div className="mt-1 grid gap-1">
								{inMonth &&
									items.map((it) => (
										<button
											key={it.id}
											onClick={() => onOpen(it)}
											title={it.title}
											className={cn(
												"soft-ring truncate rounded-md border-l-4 bg-base-200 px-1.5 py-1 text-left text-[11px] font-medium leading-tight hover:bg-base-300",
												chipBorder[it.status],
											)}
										>
											{it.title}
										</button>
									))}
							</div>
						</div>
					);
				})}
			</div>
			</div>
			</div>
		</section>
	);
}

/* ───────────────────────────────── Halaman ───────────────────────────────── */

export function CalendarDetailPage() {
	const { id = "" } = useParams();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user)!;

	const { data: cal, isLoading, error, refetch } = useCalendar(id);
	const submit = useSubmitCalendar(id);
	const approveAll = useApproveAll(id);
	const del = useDeleteCalendar();
	const addComment = useAddCalendarComment(id);

	const [view, setView] = useState<"grid" | "list">(() => (typeof window !== "undefined" && window.innerWidth >= 768 ? "grid" : "list"));
	const [editorOpen, setEditorOpen] = useState(false);
	const [editorDate, setEditorDate] = useState("");
	const [editingItem, setEditingItem] = useState<CalendarItem | null>(null);
	const [viewItemId, setViewItemId] = useState<string | null>(null);
	const [submitOpen, setSubmitOpen] = useState(false);
	const [submitNote, setSubmitNote] = useState("");
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [approveAllOpen, setApproveAllOpen] = useState(false);

	const byDate = useMemo(() => {
		const map = new Map<string, CalendarItem[]>();
		for (const it of cal?.items ?? []) map.set(it.date, [...(map.get(it.date) ?? []), it]);
		return map;
	}, [cal?.items]);

	if (isLoading) return <PageLoader />;
	if (error || !cal) return <ErrorState error={error} onRetry={() => void refetch()} />;

	const isAuthor = cal.author.id === user.id;
	const editable = isAuthor && (cal.status === "DRAFT" || cal.status === "REVISION");
	const isAssignedApprover = user.role === "APPROVER" && cal.approvers.some((a) => a.id === user.id);
	const canReview = isAssignedApprover && cal.status === "SUBMITTED";
	const canComment = isAuthor || user.role !== "USER";
	const canDelete = editable || user.role === "SUPERADMIN";
	const { total, APPROVED, PENDING, REJECTED } = cal.itemCounts;
	const pct = total ? Math.round((APPROVED / total) * 100) : 0;

	const months: Date[] = [];
	for (let m = startOfMonth(toDate(cal.startDate)); m <= toDate(cal.endDate); m = addMonths(m, 1)) months.push(m);

	const items = cal.items ?? [];
	const viewItem = items.find((i) => i.id === viewItemId) ?? null;

	function openItem(item: CalendarItem) {
		if (editable) {
			setEditingItem(item);
			setEditorDate(item.date);
			setEditorOpen(true);
		} else {
			setViewItemId(item.id);
		}
	}

	function openAdd(date?: string) {
		setEditingItem(null);
		setEditorDate(date ?? cal!.startDate);
		setEditorOpen(true);
	}

	async function doSubmit() {
		try {
			await submit.mutateAsync(submitNote.trim() || undefined);
			toast.success("Kalender diajukan ke approval");
			setSubmitOpen(false);
			setSubmitNote("");
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	return (
		<>
			<Link to="/calendars" className="btn btn-ghost btn-sm -ml-2 mb-2">
				<ArrowLeft className="size-4" /> Kembali
			</Link>

			<header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge status={cal.status} />
						{cal.revisionCount > 0 && <span className="text-xs text-base-content/50">Revisi ke-{cal.revisionCount}</span>}
					</div>
					<h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{cal.title}</h1>
					<p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60">
						<span className="flex items-center gap-1.5">
							<CalendarDays className="size-4" /> {formatDate(cal.startDate)} – {formatDate(cal.endDate)}
						</span>
						<span className="flex items-center gap-1.5">
							<Avatar name={cal.author.name} size="sm" /> {cal.author.name}
						</span>
					</p>
					{cal.description && <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-base-content/75">{cal.description}</p>}
				</div>

				<div className="flex flex-wrap gap-2">
					{editable && (
						<>
							<button className="btn btn-outline btn-sm sm:btn-md" onClick={() => openAdd()}>
								<Plus className="size-4" /> Jadwal
							</button>
							<Link to={`/calendars/${cal.id}/edit`} className="btn btn-outline btn-sm sm:btn-md">
								<Pencil className="size-4" /> Edit
							</Link>
							<button className="btn btn-primary btn-sm sm:btn-md" onClick={() => setSubmitOpen(true)}>
								<Send className="size-4" /> {cal.status === "REVISION" ? "Ajukan ulang" : "Ajukan"}
							</button>
						</>
					)}
					{canReview && PENDING > 0 && (
						<button className="btn btn-success btn-sm sm:btn-md" onClick={() => setApproveAllOpen(true)}>
							<CheckCheck className="size-4" /> Setujui semua ({PENDING})
						</button>
					)}
					{canDelete && (
						<button
							className="btn btn-ghost btn-sm btn-square text-error sm:btn-md"
							onClick={() => setDeleteOpen(true)}
							aria-label="Hapus kalender"
						>
							<Trash2 className="size-4" />
						</button>
					)}
				</div>
			</header>

			{isAuthor && cal.status === "REVISION" && (
				<div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
					<RotateCcw className="mt-0.5 size-5 shrink-0 text-warning-content" aria-hidden />
					<div>
						<p className="font-bold">{REJECTED} tanggal perlu diperbaiki</p>
						<p className="mt-1 text-sm">Buka tanggal bertanda merah untuk membaca catatan approval, ubah, lalu ajukan ulang.</p>
					</div>
				</div>
			)}
			{canReview && (
				<div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
					<b>Giliran kamu mereview.</b> Klik tiap tanggal untuk menyetujui atau menolak beserta catatannya. Kalender dinyatakan selesai
					setelah semua tanggal diputuskan.
				</div>
			)}

			{/* Ringkasan progres */}
			<section className="surface mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5">
				<div className="flex flex-1 flex-col gap-1.5">
					<div className="flex justify-between text-sm">
						<b>{total} jadwal</b>
						<span className="text-base-content/60">{pct}% disetujui</span>
					</div>
					<progress className="progress progress-success h-2 w-full" value={pct} max={100} aria-label={`${pct}% disetujui`} />
				</div>
				<ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/70">
					<li className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-full bg-success" />
						Disetujui {APPROVED}
					</li>
					<li className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-full bg-info" />
						Menunggu {PENDING}
					</li>
					<li className="flex items-center gap-1.5">
						<span className="size-2.5 rounded-full bg-error" />
						Ditolak {REJECTED}
					</li>
				</ul>
				<div className="join self-start sm:self-auto" role="group" aria-label="Tampilan">
					<button
						className={cn("btn btn-sm join-item", view === "grid" && "btn-primary")}
						onClick={() => setView("grid")}
						aria-pressed={view === "grid"}
					>
						<LayoutGrid className="size-4" /> Kalender
					</button>
					<button
						className={cn("btn btn-sm join-item", view === "list" && "btn-primary")}
						onClick={() => setView("list")}
						aria-pressed={view === "list"}
					>
						<List className="size-4" /> Daftar
					</button>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[1fr_21rem]">
				<div className="grid content-start gap-4">
					{view === "grid" ? (
						months.map((m) => (
							<MonthGrid
								key={m.toISOString()}
								month={m}
								calendar={cal}
								byDate={byDate}
								canAdd={editable}
								onAdd={(d) => openAdd(d)}
								onOpen={openItem}
							/>
						))
					) : items.length === 0 ? (
						<div className="surface px-6 py-12 text-center text-sm text-base-content/60">
							Belum ada jadwal.{" "}
							{editable && (
								<button className="link link-primary font-semibold no-underline" onClick={() => openAdd()}>
									Tambah jadwal pertama
								</button>
							)}
						</div>
					) : (
						<ul className="grid gap-2">
							{items.map((it) => (
								<li key={it.id}>
									<button
										onClick={() => openItem(it)}
										className={cn(
											"surface soft-ring flex w-full items-center gap-3 border-l-4 p-3 text-left transition hover:border-primary/40",
											chipBorder[it.status],
										)}
									>
										<span className="grid w-12 shrink-0 place-items-center rounded-lg bg-base-200 py-1">
											<span className="text-lg font-extrabold leading-none">{formatDate(it.date, "d")}</span>
											<span className="text-[10px] font-semibold uppercase text-base-content/60">
												{formatDate(it.date, "MMM")}
											</span>
										</span>
										<span className="min-w-0 flex-1">
											<span className="block truncate text-sm font-semibold">{it.title}</span>
											<span className="text-xs text-base-content/55">
												{PLATFORM_SHORT[it.platform]}
												{it.format && ` · ${it.format}`}
											</span>
										</span>
										<ItemStatusBadge status={it.status} />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<aside className="grid content-start gap-4">
					<section className="surface p-5">
						<h2 className="mb-3 font-bold">Approval</h2>
						{cal.approvers.length === 0 ? (
							<p className="text-sm text-base-content/55">Belum dipilih.</p>
						) : (
							<ul className="grid gap-2.5">
								{cal.approvers.map((a) => (
									<li key={a.id} className="flex items-center gap-3">
										<Avatar name={a.name} />
										<span className="min-w-0">
											<span className="block truncate text-sm font-semibold">{a.name}</span>
											<span className="block truncate text-xs text-base-content/55">{a.email}</span>
										</span>
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="surface grid gap-4 p-5">
						<h2 className="font-bold">Aktivitas & komentar</h2>
						<ActivityTimeline
							entries={(cal.comments ?? []).map((c) => ({
								id: c.id,
								action: c.action,
								message: c.message,
								round: c.round,
								createdAt: c.createdAt,
								author: c.author,
								context: c.item ? `${formatDate(c.item.date, "d MMM")} · ${c.item.title}` : undefined,
							}))}
						/>
						{canComment && <CommentBox onSend={(message) => addComment.mutateAsync({ message })} />}
					</section>
				</aside>
			</div>

			{/* Tambah / edit jadwal (author) */}
			<Modal open={editorOpen} onClose={() => setEditorOpen(false)} title={editingItem ? "Edit jadwal" : "Tambah jadwal"} wide>
				<ItemEditor
					key={`${editingItem?.id ?? "new"}-${editorDate}`}
					calendar={cal}
					item={editingItem}
					initialDate={editorDate}
					onDone={() => setEditorOpen(false)}
				/>
			</Modal>

			{/* Lihat jadwal / review per tanggal */}
			<Modal open={Boolean(viewItem)} onClose={() => setViewItemId(null)} title="Detail jadwal" wide>
				{viewItem && (
					<ItemViewer
						calendar={cal}
						item={viewItem}
						canReview={canReview && viewItem.status === "PENDING"}
						canComment={canComment}
						onDone={() => setViewItemId(null)}
					/>
				)}
			</Modal>

			<Modal
				open={submitOpen}
				onClose={() => setSubmitOpen(false)}
				title={cal.status === "REVISION" ? "Ajukan ulang kalender" : "Ajukan kalender"}
				footer={
					<>
						<button className="btn btn-ghost" onClick={() => setSubmitOpen(false)}>
							Batal
						</button>
						<button className="btn btn-primary" onClick={() => void doSubmit()} disabled={submit.isPending}>
							{submit.isPending && <span className="loading loading-spinner loading-sm" />}
							Ajukan
						</button>
					</>
				}
			>
				<p className="mb-3 text-sm text-base-content/70">
					{total} jadwal akan dikirim ke {cal.approvers.length} approval.
					{cal.status === "REVISION" && " Tanggal yang sudah disetujui tidak perlu direview ulang."} Kalender tidak bisa diedit sampai semua
					tanggal diputuskan.
				</p>
				<textarea
					className="textarea textarea-bordered w-full"
					rows={3}
					placeholder="Catatan untuk approval (opsional)"
					value={submitNote}
					onChange={(e) => setSubmitNote(e.target.value)}
				/>
			</Modal>

			<ConfirmDialog
				open={approveAllOpen}
				loading={approveAll.isPending}
				title="Setujui semua tanggal?"
				message={`${PENDING} tanggal yang menunggu akan disetujui sekaligus.`}
				confirmLabel="Setujui semua"
				onClose={() => setApproveAllOpen(false)}
				onConfirm={async () => {
					try {
						await approveAll.mutateAsync(undefined);
						toast.success("Semua tanggal disetujui");
						setApproveAllOpen(false);
					} catch (err) {
						toast.error(getErrorMessage(err));
					}
				}}
			/>

			<ConfirmDialog
				open={deleteOpen}
				danger
				loading={del.isPending}
				title="Hapus kalender?"
				message="Kalender beserta seluruh jadwal dan komentarnya akan dihapus permanen."
				confirmLabel="Hapus"
				onClose={() => setDeleteOpen(false)}
				onConfirm={async () => {
					try {
						await del.mutateAsync(cal.id);
						toast.success("Kalender dihapus");
						navigate("/calendars", { replace: true });
					} catch (err) {
						toast.error(getErrorMessage(err));
					}
				}}
			/>
		</>
	);
}
