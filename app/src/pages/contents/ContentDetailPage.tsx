import { ArrowLeft, Check, Clipboard, Clock, Pencil, RotateCcw, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { useAddContentComment, useContent, useDeleteContent, useReviewContent, useSubmitContent } from "@/api/contents";
import { useApplicationSettings } from "@/api/settings";
import { ActivityTimeline, CommentBox } from "@/components/ui/ActivityTimeline";
import { Avatar } from "@/components/ui/Avatar";
import { ErrorState, PageLoader } from "@/components/ui/Loading";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RichText } from "@/components/ui/RichText";
import { richTextToText } from "@/lib/rich-text";
import { getErrorMessage } from "@/lib/api";
import { PLATFORM_LABEL, TYPE_BASE_PATH, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { Content, ContentType } from "@/types";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="surface p-5 sm:p-6">
			<h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">{title}</h2>
			<div className="whitespace-pre-wrap leading-relaxed">{children}</div>
		</section>
	);
}

function scriptToText(c: Content) {
	return [
		c.title,
		c.hook && `HOOK:\n${c.hook}`,
		c.body && `ISI:\n${richTextToText(c.body)}`,
		c.cta && `CTA:\n${c.cta}`,
		c.hashtags.length > 0 && c.hashtags.map((h) => `#${h}`).join(" "),
	]
		.filter(Boolean)
		.join("\n\n");
}

export function ContentDetailPage({ type }: { type: ContentType }) {
	const { id = "" } = useParams();
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user)!;
	const base = TYPE_BASE_PATH[type];

	const { data: c, isLoading, error, refetch } = useContent(id);
	const submit = useSubmitContent(id);
	const settings = useApplicationSettings();
	const review = useReviewContent(id);
	const addComment = useAddContentComment(id);
	const del = useDeleteContent();

	const [submitOpen, setSubmitOpen] = useState(false);
	const [submitNote, setSubmitNote] = useState("");
	const [submitError, setSubmitError] = useState("");
	const [deleteOpen, setDeleteOpen] = useState(false);
	const [reviewMode, setReviewMode] = useState<"APPROVE" | "REJECT" | null>(null);
	const [reviewNote, setReviewNote] = useState("");

	if (isLoading) return <PageLoader />;
	if (error || !c) return <ErrorState error={error} onRetry={() => void refetch()} />;

	const isAuthor = c.author.id === user.id;
	const editable = isAuthor && (c.status === "DRAFT" || c.status === "REVISION");
	const canReview = user.role === "APPROVER" && c.status === "SUBMITTED" && c.approvers.some((a) => a.id === user.id);
	const canDelete = !c.workTask && (editable || user.role === "SUPERADMIN");
	const lastReject = [...(c.comments ?? [])].reverse().find((x) => x.action === "REJECT");

	async function doSubmit() {
		if (!settings.data || settings.isError) { toast.error("Tidak dapat memuat pengaturan approval"); return; }
		if (settings.data.approvalEnabled && c!.approvers.length === 0) {
			setSubmitError("Pilih minimal 1 approver melalui menu Edit sebelum mengajukan.");
			toast.error("Pilih minimal 1 approver sebelum mengajukan");
			return;
		}
		try {
			const saved = await submit.mutateAsync(submitNote.trim() || undefined);
			toast.success(saved.status === "APPROVED" ? "Pengajuan langsung disetujui" : "Berhasil diajukan ke approval");
			setSubmitOpen(false);
			setSubmitNote("");
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	async function doReview() {
		if (!reviewMode) return;
		if (reviewMode === "REJECT" && reviewNote.trim().length < 3) {
			toast.error("Tulis alasan penolakan agar user tahu apa yang perlu diperbaiki");
			return;
		}
		try {
			await review.mutateAsync({ action: reviewMode, message: reviewNote.trim() || undefined });
			toast.success(reviewMode === "APPROVE" ? "Disetujui" : "Dikembalikan ke user untuk revisi");
			setReviewMode(null);
			setReviewNote("");
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	async function doDelete() {
		try {
			await del.mutateAsync(c!.id);
			toast.success("Berhasil dihapus");
			navigate(base, { replace: true });
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	async function copyScript() {
		try {
			await navigator.clipboard.writeText(scriptToText(c!));
			toast.success("Script disalin");
		} catch {
			toast.error("Gagal menyalin");
		}
	}

	return (
		<>
			<Link to={base} className="btn btn-ghost btn-sm -ml-2 mb-2">
				<ArrowLeft className="size-4" /> Kembali
			</Link>

            {c.workTask && <section className="surface mb-6 p-5"><Link to="/tasks" className="font-bold text-primary">Penugasan: {c.workTask.title}</Link><p className="mt-2 text-sm">Dari {c.workTask.assigner.name} · Deadline {formatDateTime(c.workTask.deadline)}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">{c.workTask.brief}</p></section>}
			<header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<StatusBadge status={c.status} />
						<span className="badge badge-outline badge-sm">{PLATFORM_LABEL[c.platform]}</span>
						{c.category && <span className="badge badge-ghost badge-sm">{c.category}</span>}
						{c.revisionCount > 0 && <span className="text-xs text-base-content/50">Revisi ke-{c.revisionCount}</span>}
					</div>
					<h1 className="mt-2 text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">{c.title}</h1>
					<p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/60">
						<span className="flex items-center gap-1.5">
							<Avatar name={c.author.name} size="sm" /> {c.author.name}
						</span>
						<span>Dibuat {formatDateTime(c.createdAt)}</span>
						{c.submittedAt && (
							<span className="flex items-center gap-1">
								<Clock className="size-3.5" /> Diajukan {formatDateTime(c.submittedAt)}
							</span>
						)}
					</p>
				</div>

				<div className="flex flex-wrap gap-2">
					{type === "SCRIPT" && (
						<button className="btn btn-outline btn-sm sm:btn-md" onClick={() => void copyScript()}>
							<Clipboard className="size-4" /> Salin
						</button>
					)}
					{editable && (
						<>
							<Link to={`${base}/${c.id}/edit`} className="btn btn-outline btn-sm sm:btn-md">
								<Pencil className="size-4" /> Edit
							</Link>
							<button className="btn btn-primary btn-sm sm:btn-md" onClick={() => setSubmitOpen(true)}>
								<Send className="size-4" /> {c.status === "REVISION" ? "Ajukan ulang" : "Ajukan"}
							</button>
						</>
					)}
					{canDelete && (
						<button
							className="btn btn-ghost btn-sm btn-square text-error sm:btn-md"
							onClick={() => setDeleteOpen(true)}
							aria-label="Hapus"
						>
							<Trash2 className="size-4" />
						</button>
					)}
				</div>
			</header>

			{isAuthor && c.status === "REVISION" && lastReject && (
				<div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
					<RotateCcw className="mt-0.5 size-5 shrink-0 text-warning-content" aria-hidden />
					<div className="min-w-0">
						<p className="font-bold">Perlu revisi dari {lastReject.author.name}</p>
						{lastReject.message && <p className="mt-1 whitespace-pre-wrap text-sm">{lastReject.message}</p>}
						<p className="mt-2 text-xs text-base-content/60">Perbaiki lewat tombol Edit, lalu ajukan ulang.</p>
					</div>
				</div>
			)}

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
				<div className="grid content-start gap-4">
					{type === "SCRIPT" ? (
						<>
							{c.hook && <Block title="Hook">{c.hook}</Block>}
							{c.body && (
								<Block title="Isi script">
									<RichText value={c.body} />
								</Block>
							)}
							{c.cta && <Block title="Call to action">{c.cta}</Block>}
							{!c.hook && !c.body && !c.cta && <Block title="Isi">Belum ada isi script.</Block>}
						</>
					) : (
						<Block title="Deskripsi ide">{c.description ? <RichText value={c.description} /> : "Belum ada deskripsi."}</Block>
					)}

					{(c.tone || c.durationSec || c.hashtags.length > 0) && (
						<section className="surface flex flex-wrap items-center gap-2 p-5">
							{c.tone && <span className="badge badge-soft badge-primary">Tone: {c.tone}</span>}
							{c.durationSec && <span className="badge badge-soft badge-secondary">{c.durationSec} detik</span>}
							{c.hashtags.map((h) => (
								<span key={h} className="badge badge-ghost">
									#{h}
								</span>
							))}
						</section>
					)}
				</div>

				<aside className="grid content-start gap-4">
					{canReview && (
						<section className="surface grid gap-3 border-primary/40 p-5">
							<h2 className="font-bold">Keputusan review</h2>
							<p className="text-xs text-base-content/60">
								Jika ditolak, pengajuan kembali ke user dan bisa diajukan ulang sampai disetujui.
							</p>
							<div className="grid grid-cols-2 gap-2">
								<button className="btn btn-success" onClick={() => setReviewMode("APPROVE")}>
									<Check className="size-4" /> Setujui
								</button>
								<button className="btn btn-warning" onClick={() => setReviewMode("REJECT")}>
									<RotateCcw className="size-4" /> Tolak
								</button>
							</div>
						</section>
					)}

					<section className="surface p-5">
						<h2 className="mb-3 font-bold">Approval</h2>
						{c.approvers.length === 0 ? (
							<p className="text-sm text-base-content/55">Belum dipilih.</p>
						) : (
							<ul className="grid gap-2.5">
								{c.approvers.map((a) => (
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
							entries={(c.comments ?? []).map((x) => ({
								id: x.id,
								action: x.action,
								message: x.message,
								round: x.round,
								createdAt: x.createdAt,
								author: x.author,
							}))}
						/>
						{(isAuthor || user.role !== "USER") && <CommentBox onSend={(message) => addComment.mutateAsync(message)} />}
					</section>
				</aside>
			</div>

			<Modal
				open={submitOpen}
				onClose={() => setSubmitOpen(false)}
				title={c.status === "REVISION" ? "Ajukan ulang revisi" : "Ajukan konten"}
				footer={
					<>
						<button className="btn btn-ghost" onClick={() => setSubmitOpen(false)}>
							Batal
						</button>
						<button className="btn btn-primary" onClick={() => void doSubmit()} disabled={submit.isPending || !settings.data || settings.isError}>
							{submit.isPending && <span className="loading loading-spinner loading-sm" />}
							Ajukan
						</button>
					</>
				}
			>
				<p className="mb-3 text-sm text-base-content/70">
					{settings.data?.approvalEnabled === false ? "Approval nonaktif. Pengajuan langsung disetujui dan data tidak bisa diedit setelah diajukan." : `Akan dikirim ke ${c.approvers.length} approval. Setelah diajukan, data tidak bisa diedit sampai ada keputusan.`}
				</p>
				{settings.isError && <p role="alert" className="mb-3 text-sm text-error">{getErrorMessage(settings.error)} <button className="btn btn-ghost btn-sm" onClick={() => void settings.refetch()}>Coba lagi</button></p>}
				{submitError && settings.data?.approvalEnabled && c.approvers.length === 0 && <p role="alert" className="mb-3 text-sm text-error">{submitError} <Link className="link" to={`${base}/${id}/edit`}>Pilih approver</Link></p>}
				<textarea
					className="textarea textarea-bordered w-full"
					rows={3}
					placeholder="Catatan pengajuan (opsional)"
					value={submitNote}
					onChange={(e) => setSubmitNote(e.target.value)}
				/>
			</Modal>

			<Modal
				open={reviewMode !== null}
				onClose={() => setReviewMode(null)}
				title={reviewMode === "APPROVE" ? "Setujui pengajuan" : "Kembalikan untuk revisi"}
				footer={
					<>
						<button className="btn btn-ghost" onClick={() => setReviewMode(null)}>
							Batal
						</button>
						<button
							className={reviewMode === "APPROVE" ? "btn btn-success" : "btn btn-warning"}
							onClick={() => void doReview()}
							disabled={review.isPending}
						>
							{review.isPending && <span className="loading loading-spinner loading-sm" />}
							{reviewMode === "APPROVE" ? "Setujui" : "Kirim ke user"}
						</button>
					</>
				}
			>
				<textarea
					className="textarea textarea-bordered w-full"
					rows={4}
					placeholder={reviewMode === "APPROVE" ? "Komentar (opsional)" : "Jelaskan apa yang perlu diperbaiki (wajib)"}
					value={reviewNote}
					onChange={(e) => setReviewNote(e.target.value)}
				/>
			</Modal>

			<ConfirmDialog
				open={deleteOpen}
				danger
				loading={del.isPending}
				title="Hapus data ini?"
				message="Data beserta seluruh komentarnya akan dihapus permanen."
				confirmLabel="Hapus"
				onClose={() => setDeleteOpen(false)}
				onConfirm={() => void doDelete()}
			/>
		</>
	);
}
