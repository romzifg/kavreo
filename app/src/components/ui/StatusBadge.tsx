import { CheckCircle2, CircleDashed, Clock, RotateCcw, XCircle } from "lucide-react";
import { ITEM_STATUS_LABEL, STATUS_LABEL, cn } from "@/lib/format";
import type { ItemStatus, ReviewStatus } from "@/types";

const reviewStyle: Record<ReviewStatus, { cls: string; icon: typeof Clock }> = {
	DRAFT: { cls: "badge-ghost", icon: CircleDashed },
	SUBMITTED: { cls: "badge-info badge-soft", icon: Clock },
	REVISION: { cls: "badge-warning badge-soft", icon: RotateCcw },
	APPROVED: { cls: "badge-success badge-soft", icon: CheckCircle2 },
};

export function StatusBadge({ status, className }: { status: ReviewStatus; className?: string }) {
	const { cls, icon: Icon } = reviewStyle[status];
	return (
		<span className={cn("badge gap-1 whitespace-nowrap font-medium", cls, className)}>
			<Icon className="size-3.5" aria-hidden />
			{STATUS_LABEL[status]}
		</span>
	);
}

const itemStyle: Record<ItemStatus, { cls: string; icon: typeof Clock }> = {
	DRAFT: { cls: "badge-ghost", icon: CircleDashed },
	PENDING: { cls: "badge-info badge-soft", icon: Clock },
	APPROVED: { cls: "badge-success badge-soft", icon: CheckCircle2 },
	REJECTED: { cls: "badge-error badge-soft", icon: XCircle },
};

export function ItemStatusBadge({ status, className }: { status: ItemStatus; className?: string }) {
	const { cls, icon: Icon } = itemStyle[status];
	return (
		<span className={cn("badge badge-sm gap-1 whitespace-nowrap font-medium", cls, className)}>
			<Icon className="size-3" aria-hidden />
			{ITEM_STATUS_LABEL[status]}
		</span>
	);
}
