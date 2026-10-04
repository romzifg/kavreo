import { cn, initials } from "@/lib/format";

const palette = [
	"bg-primary/15 text-primary",
	"bg-secondary/15 text-secondary",
	"bg-accent/25 text-accent-content",
	"bg-info/20 text-info",
	"bg-warning/25 text-warning-content",
];

export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
	const color = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
	const dim = size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-12 text-base" : "size-9 text-xs";
	return (
		<span className={cn("inline-grid shrink-0 place-items-center rounded-full font-bold", dim, color, className)} aria-hidden>
			{initials(name)}
		</span>
	);
}
