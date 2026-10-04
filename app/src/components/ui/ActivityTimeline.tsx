import { CheckCircle2, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/api";
import { ACTION_LABEL, cn, formatDateTime } from "@/lib/format";
import type { PublicUser, ReviewAction } from "@/types";
import { Avatar } from "./Avatar";

export interface ActivityEntry {
	id: string;
	action: ReviewAction;
	message: string | null;
	round: number;
	createdAt: string;
	author: PublicUser;
	/** Konteks tambahan, mis. tanggal kalender yang dikomentari */
	context?: string;
}

const iconMap = {
	SUBMIT: { icon: Send, cls: "bg-info/15 text-info" },
	COMMENT: { icon: MessageSquare, cls: "bg-base-300 text-base-content/70" },
	APPROVE: { icon: CheckCircle2, cls: "bg-success/15 text-success" },
	REJECT: { icon: RotateCcw, cls: "bg-warning/20 text-warning-content" },
} as const;

export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
	if (entries.length === 0) {
		return <p className="py-6 text-center text-sm text-base-content/55">Belum ada aktivitas.</p>;
	}
	return (
		<ol className="grid gap-4">
			{entries.map((e) => {
				const { icon: Icon, cls } = iconMap[e.action];
				return (
					<li key={e.id} className="flex gap-3">
						<Avatar name={e.author.name} size="sm" />
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
								<b>{e.author.name}</b>
								<span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cls)}>
									<Icon className="size-3" aria-hidden />
									{ACTION_LABEL[e.action]}
								</span>
								{e.round > 0 && <span className="text-xs text-base-content/50">Revisi ke-{e.round}</span>}
							</div>
							{e.context && <p className="mt-0.5 text-xs font-medium text-primary">{e.context}</p>}
							{e.message && (
								<p className="mt-1.5 whitespace-pre-wrap rounded-xl rounded-tl-sm bg-base-200 px-3 py-2 text-sm leading-relaxed">
									{e.message}
								</p>
							)}
							<time className="mt-1 block text-xs text-base-content/45">{formatDateTime(e.createdAt)}</time>
						</div>
					</li>
				);
			})}
		</ol>
	);
}

export function CommentBox({ onSend, placeholder = "Tulis komentar…" }: { onSend: (message: string) => Promise<unknown>; placeholder?: string }) {
	const [value, setValue] = useState("");
	const [busy, setBusy] = useState(false);

	async function submit() {
		const message = value.trim();
		if (!message) return;
		setBusy(true);
		try {
			await onSend(message);
			setValue("");
		} catch (err) {
			toast.error(getErrorMessage(err));
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="flex items-end gap-2">
			<textarea
				className="textarea textarea-bordered min-h-12 flex-1 resize-none"
				rows={2}
				value={value}
				placeholder={placeholder}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
				}}
			/>
			<button className="btn btn-primary btn-square" onClick={() => void submit()} disabled={busy || !value.trim()} aria-label="Kirim komentar">
				{busy ? <span className="loading loading-spinner loading-sm" /> : <Send className="size-4" />}
			</button>
		</div>
	);
}
