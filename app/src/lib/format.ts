import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import type { ContentType, ItemStatus, Platform, ReviewAction, ReviewStatus, Role } from "@/types";

export const STATUS_LABEL: Record<ReviewStatus, string> = {
	DRAFT: "Draft",
	SUBMITTED: "Menunggu review",
	REVISION: "Perlu revisi",
	APPROVED: "Disetujui",
};

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
	DRAFT: "Draft",
	PENDING: "Menunggu",
	APPROVED: "Disetujui",
	REJECTED: "Ditolak",
};

export const ACTION_LABEL: Record<ReviewAction, string> = {
	SUBMIT: "Mengajukan",
	COMMENT: "Berkomentar",
	APPROVE: "Menyetujui",
	REJECT: "Meminta revisi",
};

export const PLATFORM_LABEL: Record<Platform, string> = {
	TIKTOK: "TikTok",
	INSTAGRAM_REELS: "Instagram Reels",
	YOUTUBE_SHORTS: "YouTube Shorts",
	FACEBOOK_REELS: "Facebook Reels",
	OTHER: "Lainnya",
};

export const PLATFORM_SHORT: Record<Platform, string> = {
	TIKTOK: "TikTok",
	INSTAGRAM_REELS: "Reels",
	YOUTUBE_SHORTS: "Shorts",
	FACEBOOK_REELS: "FB Reels",
	OTHER: "Lainnya",
};

export const ROLE_LABEL: Record<Role, string> = {
	USER: "User",
	APPROVER: "Approval",
	SUPERADMIN: "Superadmin",
};

export const TYPE_LABEL: Record<ContentType, string> = { SCRIPT: "Script", IDEA: "Ide" };
export const TYPE_BASE_PATH: Record<ContentType, string> = { SCRIPT: "/scripts", IDEA: "/ideas" };

export const PLATFORMS = Object.keys(PLATFORM_LABEL) as Platform[];

/** "2026-10-04" atau ISO penuh -> Date lokal tanpa geser zona waktu untuk tanggal murni */
export function toDate(value: string): Date {
	return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(`${value}T00:00:00`) : parseISO(value);
}

export function formatDate(value: string, pattern = "d MMM yyyy") {
	return format(toDate(value), pattern, { locale: idLocale });
}

export function formatDateTime(value: string) {
	return format(toDate(value), "d MMM yyyy, HH:mm", { locale: idLocale });
}

export function timeAgo(value: string) {
	return formatDistanceToNow(toDate(value), { addSuffix: true, locale: idLocale });
}

export function initials(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((p) => p[0]?.toUpperCase() ?? "")
		.join("");
}

export function cn(...parts: (string | false | null | undefined)[]) {
	return parts.filter(Boolean).join(" ");
}

export function toISODate(d: Date) {
	return format(d, "yyyy-MM-dd");
}
