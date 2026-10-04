import { AlertCircle } from "lucide-react";
import { getErrorMessage } from "@/lib/api";

export function PageLoader() {
	return (
		<div className="grid place-items-center py-24" role="status" aria-label="Memuat">
			<span className="loading loading-spinner loading-lg text-primary" />
		</div>
	);
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
	return (
		<div className="grid gap-3" aria-hidden>
			{Array.from({ length: rows }).map((_, i) => (
				<div key={i} className="surface h-28 animate-pulse bg-base-300/40" />
			))}
		</div>
	);
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
	return (
		<div className="surface flex flex-col items-center px-6 py-12 text-center">
			<AlertCircle className="mb-3 size-9 text-error" aria-hidden />
			<p className="font-semibold">Gagal memuat data</p>
			<p className="mt-1 text-sm text-base-content/60">{getErrorMessage(error)}</p>
			{onRetry && (
				<button className="btn btn-sm btn-outline mt-4" onClick={onRetry}>
					Coba lagi
				</button>
			)}
		</div>
	);
}
