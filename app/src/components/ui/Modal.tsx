import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/format";

export function Modal({
	open,
	onClose,
	title,
	children,
	footer,
	wide,
}: {
	open: boolean;
	onClose: () => void;
	title: string;
	children: ReactNode;
	footer?: ReactNode;
	wide?: boolean;
}) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog || !open) return;
		dialog.showModal();
		const overflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			dialog.close();
			document.body.style.overflow = overflow;
		};
	}, [open]);

	return createPortal(
		<dialog
			ref={dialogRef}
			className="modal kavreo-modal modal-bottom sm:modal-middle"
			aria-modal="true"
			aria-label={title}
			onCancel={(event) => {
				event.preventDefault();
				onClose();
			}}
		>
			<div className={cn("modal-box flex flex-col overflow-hidden p-0", wide && "sm:max-w-2xl")}>
				<div className="flex shrink-0 items-center justify-between border-b border-base-300 px-5 py-4">
					<h3 className="text-lg font-bold">{title}</h3>
					<button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Tutup">
						<X className="size-4" />
					</button>
				</div>
				<div className="min-h-0 overflow-y-auto px-5 py-4">{open && children}</div>
				{footer && <div className="flex shrink-0 justify-end gap-2 border-t border-base-300 px-5 py-3">{footer}</div>}
			</div>
			<button type="button" className="modal-backdrop" onClick={onClose} aria-label="Tutup modal" tabIndex={-1} />
		</dialog>,
		document.body,
	);
}

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = "Ya, lanjutkan",
	danger,
	loading,
	onConfirm,
	onClose,
}: {
	open: boolean;
	title: string;
	message: string;
	confirmLabel?: string;
	danger?: boolean;
	loading?: boolean;
	onConfirm: () => void;
	onClose: () => void;
}) {
	return (
		<Modal
			open={open}
			onClose={onClose}
			title={title}
			footer={
				<>
					<button className="btn btn-ghost" onClick={onClose} disabled={loading}>
						Batal
					</button>
					<button className={cn("btn", danger ? "btn-error" : "btn-primary")} onClick={onConfirm} disabled={loading}>
						{loading && <span className="loading loading-spinner loading-xs" />}
						{confirmLabel}
					</button>
				</>
			}
		>
			<p className="text-base-content/80">{message}</p>
		</Modal>
	);
}
