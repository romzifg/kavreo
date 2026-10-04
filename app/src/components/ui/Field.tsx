import type { ReactNode } from "react";

export function Field({
	label,
	hint,
	error,
	children,
	required,
	as: Tag = "label",
}: {
	label: string;
	hint?: string;
	error?: string;
	required?: boolean;
	children: ReactNode;
	as?: "label" | "div";
}) {
	return (
		<Tag className="flex min-w-0 flex-col gap-1.5">
			<span className="text-sm font-semibold">
				{label}
				{required && <span className="text-error"> *</span>}
			</span>
			{children}
			{hint && !error && <span className="text-xs text-base-content/55">{hint}</span>}
			{error && (
				<span role="alert" className="text-xs font-medium text-error">
					{error}
				</span>
			)}
		</Tag>
	);
}
