import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
}: {
	icon: LucideIcon;
	title: string;
	description?: string;
	action?: ReactNode;
}) {
	return (
		<div className="surface flex flex-col items-center px-6 py-14 text-center">
			<div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
				<Icon className="size-7" aria-hidden />
			</div>
			<h3 className="text-lg font-bold">{title}</h3>
			{description && <p className="mt-1 max-w-sm text-sm text-base-content/60">{description}</p>}
			{action && <div className="mt-5">{action}</div>}
		</div>
	);
}
