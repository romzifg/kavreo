import { Clapperboard } from "lucide-react";

export function Brand({ inverse = false }: { inverse?: boolean }) {
	return (
		<span className="flex items-center gap-3">
			<span className={`brand-mark grid size-10 shrink-0 place-items-center rounded-2xl ${inverse ? "bg-white/15 text-white" : "text-white"}`}>
				<Clapperboard className="size-5" aria-hidden />
			</span>
			<span>
				<span className="block text-2xl font-extrabold leading-none tracking-tight">
					kavreo<span className={inverse ? "text-amber-300" : "text-primary"}>.</span>
				</span>
				<span
					className={`mt-1 block text-[10px] font-semibold uppercase tracking-[0.2em] ${inverse ? "text-white/60" : "text-base-content/50"}`}
				>
					Creator workspace
				</span>
			</span>
		</span>
	);
}
