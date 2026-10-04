import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router";
import { useMarkAllRead, useMarkRead, useNotifications } from "@/api/notifications";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState, SkeletonList } from "@/components/ui/Loading";
import { PageHeader } from "@/components/ui/PageHeader";
import { cn, timeAgo } from "@/lib/format";

export function NotificationsPage() {
	const navigate = useNavigate();
	const { data, isLoading, error, refetch } = useNotifications();
	const markRead = useMarkRead();
	const markAll = useMarkAllRead();
	const unread = data?.meta.unreadCount ?? 0;

	return (
		<>
			<PageHeader
				title="Notifikasi"
				subtitle={unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
				actions={
					unread > 0 && (
						<button className="btn btn-sm btn-outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
							<CheckCheck className="size-4" /> Tandai semua dibaca
						</button>
					)
				}
			/>

			{isLoading ? (
				<SkeletonList rows={5} />
			) : error ? (
				<ErrorState error={error} onRetry={() => void refetch()} />
			) : !data || data.data.length === 0 ? (
				<EmptyState
					icon={BellOff}
					title="Belum ada notifikasi"
					description="Kabar pengajuan, persetujuan, dan komentar akan muncul di sini."
				/>
			) : (
				<ul className="surface divide-y divide-base-300 overflow-hidden">
					{data.data.map((n) => (
						<li key={n.id}>
							<button
								className={cn(
									"flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-base-200",
									!n.readAt && "bg-primary/5",
								)}
								onClick={() => {
									if (!n.readAt) markRead.mutate(n.id);
									if (n.link) navigate(n.link);
								}}
							>
								<span
									className={cn(
										"mt-0.5 grid size-9 shrink-0 place-items-center rounded-full",
										n.readAt ? "bg-base-300 text-base-content/50" : "bg-primary/15 text-primary",
									)}
								>
									<Bell className="size-4" aria-hidden />
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-center gap-2">
										<b className="truncate text-sm">{n.title}</b>
										{!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" />}
									</span>
									<span className="mt-0.5 block text-sm text-base-content/70">{n.message}</span>
									<span className="mt-1 block text-xs text-base-content/45">{timeAgo(n.createdAt)}</span>
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</>
	);
}
