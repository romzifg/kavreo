import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { useContent, useCreateContent, useSubmitContent, useUpdateContent, type ContentPayload } from "@/api/contents";
import { ApprovalAssignment } from "@/components/ui/ApprovalAssignment";
import { useApplicationSettings } from "@/api/settings";
import { Field } from "@/components/ui/Field";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { AiAssistant } from "@/components/ui/AiAssistant";
import { richTextToText } from "@/lib/rich-text";
import { ErrorState, PageLoader } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { getErrorMessage } from "@/lib/api";
import { PLATFORMS, PLATFORM_LABEL, TYPE_BASE_PATH } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { Content, ContentType } from "@/types";

const schema = z.object({
	title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160, "Maksimal 160 karakter"),
	platform: z.enum(["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS", "FACEBOOK_REELS", "OTHER"]),
	category: z.string().trim().max(60),
	tone: z.string().trim().max(60),
	durationSec: z.string().regex(/^(\d{1,3})?$/, "Isi angka detik, mis. 45"),
	hook: z.string().trim().max(500, "Maksimal 500 karakter"),
	body: z.string().trim().max(10000, "Maksimal 10000 karakter termasuk format"),
	cta: z.string().trim().max(300),
	description: z.string().trim().max(5000, "Maksimal 5000 karakter termasuk format"),
	hashtags: z.string(),
	approverIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const emptyValues: FormValues = {
	title: "",
	platform: "TIKTOK",
	category: "",
	tone: "",
	durationSec: "",
	hook: "",
	body: "",
	cta: "",
	description: "",
	hashtags: "",
	approverIds: [],
};

function toFormValues(c: Content): FormValues {
	return {
		title: c.title,
		platform: c.platform,
		category: c.category ?? "",
		tone: c.tone ?? "",
		durationSec: c.durationSec ? String(c.durationSec) : "",
		hook: c.hook ?? "",
		body: c.body ?? "",
		cta: c.cta ?? "",
		description: c.description ?? "",
		hashtags: c.hashtags.map((h) => `#${h}`).join(" "),
		approverIds: c.approvers.map((a) => a.id),
	};
}

function parseHashtags(raw: string) {
	return raw
		.split(/[\s,]+/)
		.map((h) => h.replace(/^#+/, "").trim())
		.filter(Boolean);
}

function toPayload(type: ContentType, v: FormValues): ContentPayload {
	return {
		type,
		title: v.title,
		platform: v.platform,
		category: v.category || null,
		tone: type === "SCRIPT" ? v.tone || null : null,
		durationSec: type === "SCRIPT" && v.durationSec ? Number(v.durationSec) : null,
		hook: type === "SCRIPT" ? v.hook || null : null,
		body: type === "SCRIPT" ? v.body || null : null,
		cta: type === "SCRIPT" ? v.cta || null : null,
		description: type === "IDEA" ? v.description || null : null,
		hashtags: parseHashtags(v.hashtags),
		approverIds: v.approverIds,
	};
}

const wordCount = (s: string) => richTextToText(s).trim().split(/\s+/).filter(Boolean).length;

export function ContentFormPage({ type }: { type: ContentType }) {
	const { id } = useParams();
	const isEdit = Boolean(id);
	const navigate = useNavigate();
	const user = useAuthStore((s) => s.user)!;
	const base = TYPE_BASE_PATH[type];
	const label = type === "SCRIPT" ? "script" : "ide";

	const existing = useContent(id);
	const create = useCreateContent();
	const update = useUpdateContent(id ?? "");
	const submit = useSubmitContent(id ?? "");
	const settings = useApplicationSettings();

	const {
		register,
		control,
		handleSubmit,
		reset,
		watch,
		setError,
		clearErrors,
		formState: { errors, isSubmitting },
	} = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: emptyValues });

	const loadedFor = useRef<string | null>(null);
	useEffect(() => {
		if (existing.data && loadedFor.current !== existing.data.id) {
			loadedFor.current = existing.data.id;
			reset(toFormValues(existing.data));
		}
	}, [existing.data, reset]);

	if (user.role !== "USER") return <Navigate to={base} replace />;
	if (isEdit && existing.isLoading) return <PageLoader />;
	if (isEdit && (existing.error || !existing.data)) return <ErrorState error={existing.error} />;
	if (isEdit && existing.data && !["DRAFT", "REVISION"].includes(existing.data.status)) {
		return <Navigate to={`${base}/${id}`} replace />;
	}

	const isRevision = existing.data?.status === "REVISION";
	const body = watch("body");
	const aiContext = { feature: type, title: watch("title"), platform: watch("platform"), category: watch("category"), tone: watch("tone"), durationSec: watch("durationSec") };

	async function save(values: FormValues, andSubmit: boolean) {
		if (andSubmit && (!settings.data || settings.isError)) {
			toast.error("Tidak dapat memuat pengaturan approval. Coba lagi sebelum mengajukan.");
			return;
		}
		if (andSubmit && settings.data?.approvalEnabled && values.approverIds.length === 0) {
			setError("approverIds", { message: "Pilih minimal 1 approver sebelum mengajukan" });
			toast.error("Pilih minimal 1 approver sebelum mengajukan");
			return;
		}
		clearErrors("approverIds");
		const payload = toPayload(type, values);
		if (settings.data?.approvalEnabled === false) payload.approverIds = [];
		try {
			let savedId = id;
			let saved: Content;
			if (isEdit) {
				saved = await update.mutateAsync(payload);
				if (andSubmit) saved = await submit.mutateAsync(undefined);
			} else {
				const created = await create.mutateAsync({ ...payload, submit: andSubmit });
				savedId = created.id;
				saved = created;
			}
			toast.success(andSubmit ? (saved.status === "APPROVED" ? "Pengajuan langsung disetujui" : "Berhasil diajukan ke approval") : "Draft tersimpan");
			navigate(`${base}/${savedId}`);
		} catch (err) {
			toast.error(getErrorMessage(err));
		}
	}

	const busy = isSubmitting || create.isPending || update.isPending || submit.isPending;
	const submitLabel = isRevision ? "Simpan & ajukan ulang" : "Simpan & ajukan";

	return (
		<>
			<Link to={isEdit ? `${base}/${id}` : base} className="btn btn-ghost btn-sm -ml-2 mb-2">
				<ArrowLeft className="size-4" /> Kembali
			</Link>
			<PageHeader
				title={isEdit ? `Edit ${label}` : `${type === "SCRIPT" ? "Script" : "Ide"} baru`}
				subtitle={isRevision ? "Perbaiki sesuai catatan approval, lalu ajukan ulang." : "Simpan sebagai draft dulu, ajukan saat sudah siap."}
			/>

			<form className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]" noValidate onSubmit={(e) => e.preventDefault()}>
				<div className="grid gap-6">
					<section className="surface grid gap-4 p-5 sm:p-6">
						<Field label="Judul" required error={errors.title?.message}>
							<input
								className="input input-bordered w-full"
								placeholder={type === "SCRIPT" ? "mis. 3 Kesalahan Skincare Pemula" : "mis. Seri rutinitas pagi kreator"}
								{...register("title")}
							/>
						</Field>
						<div className="grid gap-4 sm:grid-cols-2">
							<Field label="Platform">
								<select className="select select-bordered w-full" {...register("platform")}>
									{PLATFORMS.map((p) => (
										<option key={p} value={p}>
											{PLATFORM_LABEL[p]}
										</option>
									))}
								</select>
							</Field>
							<Field label="Kategori" hint="mis. Edukasi, Hiburan, Promosi">
								<input className="input input-bordered w-full" {...register("category")} />
							</Field>
						</div>

						{type === "SCRIPT" ? (
							<>
								<div className="grid gap-4 sm:grid-cols-2">
									<Field label="Gaya / tone" hint="mis. Santai, Tegas, Humoris">
										<input className="input input-bordered w-full" {...register("tone")} />
									</Field>
									<Field label="Target durasi (detik)" error={errors.durationSec?.message}>
										<input
											inputMode="numeric"
											className="input input-bordered w-full"
											placeholder="45"
											{...register("durationSec")}
										/>
									</Field>
								</div>
								<Field
									label="Hook (3 detik pertama)"
									hint="Kalimat pembuka yang membuat orang berhenti scroll"
									error={errors.hook?.message}
								>
									<textarea className="textarea textarea-bordered min-h-20 w-full" {...register("hook")} />
								</Field>
								<Field
									as="div"
									label="Isi script"
									hint={`${wordCount(body)} kata · estimasi ±${Math.round(wordCount(body) / 2.5)} detik dibaca`}
									error={errors.body?.message}
								>
									<Controller
										control={control}
										name="body"
										render={({ field }) => (
											<>
											<AiAssistant context={aiContext} value={field.value} onChange={field.onChange} />
											<RichTextEditor
												value={field.value}
												onChange={field.onChange}
												onBlur={field.onBlur}
												inputRef={field.ref}
												label="Isi script"
												placeholder="Tulis ceritamu di sini…"
												error={!!errors.body}
											/>
											</>
										)}
									/>
								</Field>
								<Field label="Call to action (CTA)" error={errors.cta?.message}>
									<input
										className="input input-bordered w-full"
										placeholder="mis. Follow untuk tips lainnya!"
										{...register("cta")}
									/>
								</Field>
							</>
						) : (
							<Field
								as="div"
								label="Deskripsi ide"
								hint="Jelaskan konsep, sudut pandang, dan alasan ide ini menarik"
								error={errors.description?.message}
							>
								<Controller
									control={control}
									name="description"
									render={({ field }) => (
										<>
										<AiAssistant context={aiContext} value={field.value} onChange={field.onChange} />
										<RichTextEditor
											value={field.value}
											onChange={field.onChange}
											onBlur={field.onBlur}
											inputRef={field.ref}
											label="Deskripsi ide"
											placeholder="Mulai dari ide kecil yang menarik…"
											error={!!errors.description}
										/>
										</>
									)}
								/>
							</Field>
						)}

						<Field label="Hashtag" hint="Pisahkan dengan spasi atau koma, mis. #skincare #fyp">
							<input className="input input-bordered w-full" {...register("hashtags")} />
						</Field>
					</section>
				</div>

				<aside className="grid content-start gap-6">
						<Controller
							control={control}
							name="approverIds"
							render={({ field }) => <ApprovalAssignment value={field.value} onChange={(ids) => { field.onChange(ids); clearErrors("approverIds"); }} error={errors.approverIds?.message} />}
						/>

					<div className="surface grid gap-2 p-4">
						<button type="button" className="btn btn-primary" disabled={busy || !settings.data || settings.isError} onClick={handleSubmit((v) => save(v, true))}>
							{busy ? <span className="loading loading-spinner loading-sm" /> : <Send className="size-4" />}
							{submitLabel}
						</button>
						<button type="button" className="btn btn-outline" disabled={busy} onClick={handleSubmit((v) => save(v, false))}>
							{isRevision ? "Simpan perubahan" : "Simpan sebagai draft"}
						</button>
					</div>
				</aside>
			</form>
		</>
	);
}
