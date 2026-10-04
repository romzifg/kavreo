import { Check } from "lucide-react";
import { useApprovers } from "@/api/users";
import { cn } from "@/lib/format";
import { Avatar } from "./Avatar";

/** Pilih satu atau beberapa approval (multiple assign) */
export function ApproverPicker({ value, onChange, disabled }: { value: string[]; onChange: (ids: string[]) => void; disabled?: boolean }) {
	const { data, isLoading } = useApprovers();

	if (isLoading) return <div className="h-14 animate-pulse rounded-xl bg-base-300/50" />;
	if (!data?.length) {
		return (
			<p className="rounded-xl border border-dashed border-base-300 p-4 text-sm text-base-content/60">
				Belum ada akun Approval. Minta Superadmin menambahkannya di menu Pengguna.
			</p>
		);
	}

	const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

	return (
		<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))] gap-2" role="group" aria-label="Pilih approval">
			{data.map((a) => {
				const active = value.includes(a.id);
				return (
					<button
						key={a.id}
						type="button"
						disabled={disabled}
						onClick={() => toggle(a.id)}
						aria-pressed={active}
						className={cn(
							"soft-ring flex items-center gap-3 rounded-xl border p-3 text-left transition",
							active ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/40",
						)}
					>
						<Avatar name={a.name} />
						<span className="min-w-0 flex-1">
							<span className="block truncate text-sm font-semibold">{a.name}</span>
							<span className="block truncate text-xs text-base-content/60">{a.email}</span>
						</span>
						<span
							className={cn(
								"grid size-5 place-items-center rounded-full border",
								active ? "border-primary bg-primary text-primary-content" : "border-base-300",
							)}
						>
							{active && <Check className="size-3.5" />}
						</span>
					</button>
				);
			})}
		</div>
	);
}
