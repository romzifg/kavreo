import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
	if (totalPages <= 1) return null;
	return (
		<div className="mt-6 flex items-center justify-center gap-3">
			<button className="btn btn-sm btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Halaman sebelumnya">
				<ChevronLeft className="size-4" />
			</button>
			<span className="text-sm text-base-content/70">
				Halaman <b>{page}</b> dari {totalPages}
			</span>
			<button className="btn btn-sm btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Halaman berikutnya">
				<ChevronRight className="size-4" />
			</button>
		</div>
	);
}
