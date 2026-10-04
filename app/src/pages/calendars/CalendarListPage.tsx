import { CalendarDays, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useCalendars } from "@/api/calendars";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, SkeletonList } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_LABEL, cn, formatDate, timeAgo } from "@/lib/format";
import { useAuthStore } from "@/stores/auth.store";
import type { ReviewStatus } from "@/types";

const STATUSES: (ReviewStatus | "")[] = ["", "DRAFT", "SUBMITTED", "REVISION", "APPROVED"];

export function CalendarListPage() {
	const user = useAuthStore((s) => s.user)!;
	const isUser = user.role === "USER";
	const [q, setQ] = useState("");
	const [debouncedQ, setDebouncedQ] = useState("");
	const [status, setStatus] = useState<ReviewStatus | "">(user.role === "APPROVER" ? "SUBMITTED" : "");
	const [page, setPage] = useState(1);

	useEffect(() => {
		const t = setTimeout(() => {
			setDebouncedQ(q);
			setPage(1);
		}, 300);
		return () => clearTimeout(t);
	}, [q]);

	const { data, isLoading, error, refetch, isFetching } = useCalendars({ status, q: debouncedQ || undefined, page, pageSize: 9 });

	return (
		<>
			<PageHeader
				title="Kalender Konten"
				subtitle={
					user.role === "APPROVER"
						? "Kalender yang ditugaskan kepadamu."
						: user.role === "SUPERADMIN"
							? "Seluruh kalender dari semua pengguna (hanya lihat)."
							: "Rencanakan jadwal tayang kontenmu."
				}
				actions={
					isUser && (
						<Link to="/calendars/new" className="btn btn-primary">
							<Plus className="size-4" /> Kalender baru
						</Link>
					)
				}
			/>

			<div className="mb-4 grid gap-3">
				<label className="input input-bordered flex items-center gap-2">
					<Search className="size-4 text-base-content/50" aria-hidden />
					<input type="search" className="grow" placeholder="Cari judul kalender…" value={q} onChange={(e) => setQ(e.target.value)} />
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
					icon={CalendarDays}
					title={status || debouncedQ ? "Tidak ada hasil" : "Belum ada kalender"}
					description={
						status || debouncedQ
							? "Coba ubah filter atau kata kunci."
							: isUser
								? "Buat kalender, tambahkan jadwal per tanggal, lalu ajukan ke approval."
								: "Belum ada data yang bisa ditampilkan."
					}
					action={
						isUser &&
						!status &&
						!debouncedQ && (
							<Link to="/calendars/new" className="btn btn-primary">
								<Plus className="size-4" /> Kalender baru
							</Link>
						)
					}
				/>
			) : (
				<>
					<ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
						{data.data.map((c) => {
							const { total, APPROVED, REJECTED, PENDING } = c.itemCounts;
							const pct = total ? Math.round((APPROVED / total) * 100) : 0;
							return (
								<li key={c.id}>
									<Link
										to={`/calendars/${c.id}`}
										className="surface flex h-full flex-col p-5 transition hover:border-primary/40 hover:shadow-sm"
									>
										<div className="flex items-center justify-between gap-2">
											<StatusBadge status={c.status} />
											{c.revisionCount > 0 && <span className="text-xs text-base-content/50">Revisi ke-{c.revisionCount}</span>}
										</div>
										<h3 className="mt-3 text-lg font-bold leading-snug">{c.title}</h3>
										<p className="mt-1 text-sm text-base-content/60">
											{formatDate(c.startDate)} – {formatDate(c.endDate)}
										</p>

										<div className="mt-4">
											<div className="mb-1.5 flex justify-between text-xs text-base-content/60">
												<span>{total} jadwal</span>
												<span>
													{APPROVED} disetujui
													{PENDING > 0 && ` · ${PENDING} menunggu`}
													{REJECTED > 0 && ` · ${REJECTED} ditolak`}
												</span>
											</div>
											<progress
												className="progress progress-success h-1.5 w-full"
												value={pct}
												max={100}
												aria-label={`${pct}% disetujui`}
											/>
										</div>

										<div className="mt-auto flex items-center gap-2 pt-4 text-xs text-base-content/55">
											{!isUser && <Avatar name={c.author.name} size="sm" />}
											<span className="truncate">{isUser ? `${c.approvers.length} approval` : c.author.name}</span>
											<span className="ml-auto shrink-0">{timeAgo(c.updatedAt)}</span>
										</div>
									</Link>
								</li>
							);
						})}
					</ul>
					<Pagination page={data.meta.page} totalPages={data.meta.totalPages} onChange={setPage} />
				</>
			)}
		</>
	);
}
