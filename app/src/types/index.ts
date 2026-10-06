export type Role = "USER" | "APPROVER" | "SUPERADMIN";
export type ContentType = "SCRIPT" | "IDEA";
export type ReviewStatus = "DRAFT" | "SUBMITTED" | "REVISION" | "APPROVED";
export type ItemStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type ReviewAction = "SUBMIT" | "COMMENT" | "APPROVE" | "REJECT";
export type Platform = "TIKTOK" | "INSTAGRAM_REELS" | "YOUTUBE_SHORTS" | "FACEBOOK_REELS" | "OTHER";

export interface PublicUser {
	id: string;
	name: string;
	email: string;
	role?: Role;
}

export interface User extends PublicUser {
	role: Role;
	phone: string | null;
	isActive: boolean;
	notifyEmail: boolean;
	notifyWhatsapp: boolean;
	createdAt: string;
}

export interface Paginated<T> {
	data: T[];
	meta: { total: number; page: number; pageSize: number; totalPages: number };
}

export interface ContentComment {
	id: string;
	action: ReviewAction;
	message: string | null;
	round: number;
	createdAt: string;
	author: PublicUser;
}

export interface Content {
 workTask?: { id:string; title:string; brief:string; deadline:string; assignerId:string; assigner:PublicUser } | null;
	id: string;
	type: ContentType;
	title: string;
	platform: Platform;
	category: string | null;
	hook: string | null;
	body: string | null;
	cta: string | null;
	tone: string | null;
	durationSec: number | null;
	description: string | null;
	hashtags: string[];
	status: ReviewStatus;
	revisionCount: number;
	submittedAt: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	author: PublicUser;
	approvers: PublicUser[];
	comments?: ContentComment[];
	_count?: { comments: number };
}

export interface CalendarItem {
	id: string;
	calendarId: string;
	date: string; // YYYY-MM-DD
	title: string;
	platform: Platform;
	format: string | null;
	notes: string | null;
	contentId: string | null;
	status: ItemStatus;
	reviewNote: string | null;
	reviewedAt: string | null;
	reviewedBy?: PublicUser | null;
	content?: { id: string; title: string; type: ContentType; status: ReviewStatus } | null;
}

export interface CalendarComment {
	id: string;
	action: ReviewAction;
	message: string | null;
	round: number;
	createdAt: string;
	author: PublicUser;
	item: { id: string; title: string; date: string } | null;
}

export interface ItemCounts {
	DRAFT: number;
	PENDING: number;
	APPROVED: number;
	REJECTED: number;
	total: number;
}

export interface Calendar {
	id: string;
	title: string;
	description: string | null;
	startDate: string;
	endDate: string;
	status: ReviewStatus;
	revisionCount: number;
	submittedAt: string | null;
	approvedAt: string | null;
	createdAt: string;
	updatedAt: string;
	author: PublicUser;
	approvers: PublicUser[];
	itemCounts: ItemCounts;
	items?: CalendarItem[];
	comments?: CalendarComment[];
}

export interface AppNotification {
	id: string;
	title: string;
	message: string;
	link: string | null;
	readAt: string | null;
	createdAt: string;
}

export type StatusCounts = Record<ReviewStatus, number>;

export interface DashboardData {
	role: Role;
	contents: { SCRIPT: StatusCounts; IDEA: StatusCounts };
	calendars: StatusCounts;
	upcoming?: (CalendarItem & { calendar: { id: string; title: string } })[];
	needRevision?: {
		contents: { id: string; type: ContentType; title: string; updatedAt: string }[];
		calendars: { id: string; title: string; updatedAt: string }[];
	};
	pending?: {
		contents: { id: string; type: ContentType; title: string; submittedAt: string | null; revisionCount: number; author: PublicUser }[];
		calendars: { id: string; title: string; submittedAt: string | null; revisionCount: number; author: PublicUser }[];
	};
	users?: Record<Role, number>;
}
