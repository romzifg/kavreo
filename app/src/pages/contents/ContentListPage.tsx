import { FileText, Lightbulb, MessageSquare, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useContents } from "@/api/contents";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, SkeletonList } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PLATFORM_SHORT, STATUS_LABEL, TYPE_BASE_PATH, cn, timeAgo } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import { richTextToText } from "@/lib/rich-text";
import type { ContentType, ReviewStatus } from "@/types";

const COPY: Record<ContentType, { title: string; newLabel: string; icon: typeof FileText; emptyDesc: string }> = {
	SCRIPT: {
		title: "Script Video",
		newLabel: "Script baru",
		icon: FileText,
		emptyDesc: "Susun hook, isi, dan CTA video pendekmu lalu ajukan ke approval.",
	},
	IDEA: {
		title: "Ide Konten",
		newLabel: "Ide baru",
		icon: Lightbulb,
		emptyDesc: "Catat ide kontenmu di sini sebelum lupa, lalu ajukan jika sudah matang.",
	},
};

const STATUSES: (ReviewStatus | "")[] = ["", "DRAFT", "SUBMITTED", "REVISION", "APPROVED"];

export function ContentListPage({ type }: { type: ContentType }) {
	const user = useAuthStore((s) => s.user)!;
	const copy = COPY[type];
	const isUser = user.role === "USER";

	const [q, setQ] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [status, setStatus] = useState<ReviewStatus | "">(user.role === "APPROVER" ? "SUBMITTED" : "");
	const [page, setPage] = useState(1);

	// Reset saat berpindah antara Script <-> Ide
	useEffect(() => {
		setPage(1);
		setQ("");
	}, [type]);

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedQ(q);
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [q]);

	const { data, isLoading, error, refetch, isFetching } = useContents({ type, status, q: debouncedQ || undefined, page, pageSize: 10 });
	const base = TYPE_BASE_PATH[type];

	const subtitle =
		user.role === "APPROVER"
			? "Pengajuan yang ditugaskan kepadamu."
			: user.role === "SUPERADMIN"
				? "Seluruh data dari semua pengguna (hanya lihat)."
				: "Semua buatanmu, dari draft sampai disetujui.";

	return (
		<>
			<PageHeader
				title={copy.title}
				subtitle={subtitle}
				actions={
					isUser && (
						<Link to={`${base}/new`} className="btn btn-primary">
							<Plus className="size-4" /> {copy.newLabel}
						</Link>
					)
				}
			/>

			<div className="mb-4 grid gap-3">
				<label className="input input-bordered flex items-center gap-2">
					<Search className="size-4 text-base-content/50" aria-hidden />
					<input
						type="search"
						className="grow"
						placeholder="Cari judul, kategori, atau #hashtag…"
						value={q}
						onChange={(e) => setQ(e.target.value)}
					/>
					{isFetching && <span className="loading loading-spinner loading-xs text-primary" />}
				</label>
				<div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filter status">
					{STATUSES.map((s) => (
						<button
							key={s || "all"}
							role="tab"
							aria-selected={status === s}
							onClick={() => {
								setStatus(s);
								setPage(1);
							}}
							className={cn(
								"btn btn-sm shrink-0 rounded-full",
								status === s ? "btn-primary" : "btn-ghost border border-base-300 bg-base-100",
							)}
						>
							{s ? STATUS_LABEL[s] : "Semua"}
						</button>
					))}
				</div>
			</div>

			{isLoading ? (
				<SkeletonList />
			) : error ? (
				<ErrorState error={error} onRetry={() => void refetch()} />
			) : !data || data.data.length === 0 ? (
				<EmptyState
					icon={copy.icon}
					title={status || debouncedQ ? "Tidak ada hasil" : `Belum ada ${copy.title.toLowerCase()}`}
					description={
						status || debouncedQ ? "Coba ubah filter atau kata kunci." : isUser ? copy.emptyDesc : "Belum ada data yang bisa ditampilkan."
					}
					action={
						isUser &&
						!status &&
						!debouncedQ && (
							<Link to={`${base}/new`} className="btn btn-primary">
								<Plus className="size-4" /> {copy.newLabel}
							</Link>
						)
					}
				/>
			) : (
				<>
					<ul className="grid gap-3">
						{data.data.map((c) => (
							<li key={c.id}>
								<Link to={`${base}/${c.id}`} className="surface block p-4 transition hover:border-primary/40 hover:shadow-sm sm:p-5">
									<div className="flex flex-wrap items-center gap-2">
										<StatusBadge status={c.status} />
										<span className="badge badge-outline badge-sm">{PLATFORM_SHORT[c.platform]}</span>
										{c.category && <span className="badge badge-ghost badge-sm">{c.category}</span>}
										{c.revisionCount > 0 && <span className="text-xs text-base-content/50">Revisi ke-{c.revisionCount}</span>}
									</div>
									<h3 className="mt-2.5 text-base font-bold leading-snug sm:text-lg">{c.title}</h3>
									<p className="mt-1 line-clamp-2 text-sm text-base-content/65">
										{richTextToText((type === "SCRIPT" ? c.hook || c.body : c.description) || "") || "Belum ada isi."}
									</p>
									<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-base-content/55">
										{!isUser && (
											<span className="flex items-center gap-1.5">
												<Avatar name={c.author.name} size="sm" /> {c.author.name}
											</span>
										)}
										{c.approvers.length > 0 && (
											<span className="flex items-center gap-1.5">
												<span className="flex -space-x-2">
													{c.approvers.slice(0, 3).map((a) => (
														<Avatar key={a.id} name={a.name} size="sm" className="ring-2 ring-base-100" />
													))}
												</span>
												{c.approvers.length === 1 ? c.approvers[0]!.name : `${c.approvers.length} approval`}
											</span>
										)}
										<span className="flex items-center gap-1">
											<MessageSquare className="size-3.5" /> {c._count?.comments ?? 0}
										</span>
										<span className="ml-auto">Diperbarui {timeAgo(c.updatedAt)}</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
					<Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
				</>
			)}
		</>
	);
}
