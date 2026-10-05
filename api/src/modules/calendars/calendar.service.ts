import type { Prisma, ReviewStatus } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, notFound } from "../../common/errors";
import type { AuthUser } from "../../common/types";
import { pageMeta, parseDateOnly, publicUserSelect, toDateOnly } from "../../common/utils";
import { notifyUsers } from "../notifications/notification.service";
import type { CreateCalendarInput, ItemInput, UpdateCalendarInput, UpdateItemInput } from "./calendar.schema";
import { AUTO_APPROVAL_MESSAGE, assertRequiredApprovers } from "../../common/approval";
import { getApplicationSettings } from "../settings/settings.service";

const EDITABLE: ReviewStatus[] = ["DRAFT", "REVISION"];
const linkOf = (id: string) => `/calendars/${id}`;

const listInclude = {
	author: { select: publicUserSelect },
	approvers: { include: { approver: { select: publicUserSelect } } },
	items: { select: { status: true } },
} satisfies Prisma.CalendarInclude;

const detailInclude = {
	author: { select: publicUserSelect },
	approvers: { include: { approver: { select: publicUserSelect } } },
	items: {
		orderBy: [{ date: "asc" as const }, { createdAt: "asc" as const }],
		include: {
			content: { select: { id: true, title: true, type: true, status: true } },
			reviewedBy: { select: publicUserSelect },
		},
	},
	comments: {
		orderBy: { createdAt: "asc" as const },
		include: {
			author: { select: publicUserSelect },
			item: { select: { id: true, title: true, date: true } },
		},
	},
} satisfies Prisma.CalendarInclude;

function itemCounts(items: { status: string }[]) {
	const counts = { DRAFT: 0, PENDING: 0, APPROVED: 0, REJECTED: 0, total: items.length };
	for (const i of items) counts[i.status as "DRAFT" | "PENDING" | "APPROVED" | "REJECTED"]++;
	return counts;
}

function serializeList(c: Prisma.CalendarGetPayload<{ include: typeof listInclude }>) {
	const { approvers, items, ...rest } = c;
	return {
		...rest,
		startDate: toDateOnly(c.startDate),
		endDate: toDateOnly(c.endDate),
		approvers: approvers.map((a) => a.approver),
		itemCounts: itemCounts(items),
	};
}

function serializeDetail(c: Prisma.CalendarGetPayload<{ include: typeof detailInclude }>) {
	const { approvers, items, comments, ...rest } = c;
	return {
		...rest,
		startDate: toDateOnly(c.startDate),
		endDate: toDateOnly(c.endDate),
		approvers: approvers.map((a) => a.approver),
		items: items.map((i) => ({ ...i, date: toDateOnly(i.date) })),
		comments: comments.map((cm) => ({
			...cm,
			item: cm.item ? { ...cm.item, date: toDateOnly(cm.item.date) } : null,
		})),
		itemCounts: itemCounts(items),
	};
}

function scopeWhere(user: AuthUser): Prisma.CalendarWhereInput {
	if (user.role === "SUPERADMIN") return {};
	if (user.role === "APPROVER") {
		return { approvers: { some: { approverId: user.id } }, status: { not: "DRAFT" } };
	}
	return { authorId: user.id };
}

async function assertValidApprovers(ids: string[]) {
	if (ids.length === 0) return;
	const count = await prisma.user.count({ where: { id: { in: ids }, role: "APPROVER", isActive: true } });
	if (count !== new Set(ids).size) throw badRequest("Ada approver yang tidak valid atau tidak aktif");
}

async function assertOwnContent(userId: string, contentId?: string | null) {
	if (!contentId) return;
	const c = await prisma.content.findFirst({ where: { id: contentId, authorId: userId }, select: { id: true } });
	if (!c) throw badRequest("Script/ide yang ditautkan tidak ditemukan");
}

function assertInRange(date: string, start: Date, end: Date) {
	const d = parseDateOnly(date);
	if (d < start || d > end) throw badRequest(`Tanggal ${date} berada di luar periode kalender`);
}

async function findOwn(user: AuthUser, id: string) {
	const cal = await prisma.calendar.findUnique({
		where: { id },
		include: { approvers: { select: { approverId: true } }, _count: { select: { items: true } } },
	});
	if (!cal || cal.authorId !== user.id) throw notFound("Kalender tidak ditemukan");
	return cal;
}

async function findOwnEditable(user: AuthUser, id: string) {
	const cal = await findOwn(user, id);
	if (!EDITABLE.includes(cal.status)) {
		throw badRequest("Kalender yang sedang direview atau sudah disetujui tidak dapat diedit");
	}
	return cal;
}

export async function listCalendars(user: AuthUser, q: { status?: ReviewStatus; q?: string; page: number; pageSize: number }) {
	const where: Prisma.CalendarWhereInput = {
		AND: [scopeWhere(user), q.status ? { status: q.status } : {}, q.q ? { title: { contains: q.q, mode: "insensitive" } } : {}],
	};
	const [items, total] = await Promise.all([
		prisma.calendar.findMany({
			where,
			include: listInclude,
			orderBy: { updatedAt: "desc" },
			skip: (q.page - 1) * q.pageSize,
			take: q.pageSize,
		}),
		prisma.calendar.count({ where }),
	]);
	return { items: items.map(serializeList), meta: pageMeta(total, q.page, q.pageSize) };
}

export async function getCalendar(user: AuthUser, id: string) {
	const cal = await prisma.calendar.findFirst({
		where: { AND: [{ id }, scopeWhere(user)] },
		include: detailInclude,
	});
	if (!cal) throw notFound("Kalender tidak ditemukan");
	return serializeDetail(cal);
}

export async function createCalendar(user: AuthUser, input: CreateCalendarInput) {
	await assertValidApprovers(input.approverIds);
	const { approvalEnabled } = await getApplicationSettings();
	const start = parseDateOnly(input.startDate);
	const end = parseDateOnly(input.endDate);
	for (const item of input.items) {
		assertInRange(item.date, start, end);
		await assertOwnContent(user.id, item.contentId);
	}
	if (input.submit) {
		assertRequiredApprovers(approvalEnabled, input.approverIds);
		if (input.items.length === 0) throw badRequest("Tambahkan minimal 1 jadwal konten sebelum mengajukan");
	}

	const now = new Date();
	const cal = await prisma.calendar.create({
		data: {
			title: input.title,
			description: input.description ?? null,
			startDate: start,
			endDate: end,
			authorId: user.id,
			status: input.submit ? (approvalEnabled ? "SUBMITTED" : "APPROVED") : "DRAFT",
			submittedAt: input.submit ? now : null,
			approvedAt: input.submit && !approvalEnabled ? now : null,
			approvers: { create: [...new Set(input.approverIds)].map((approverId) => ({ approverId })) },
			items: {
				create: input.items.map((i) => ({
					date: parseDateOnly(i.date),
					title: i.title,
					platform: i.platform,
					format: i.format ?? null,
					notes: i.notes ?? null,
					contentId: i.contentId || null,
					status: input.submit ? (approvalEnabled ? "PENDING" : "APPROVED") : "DRAFT",
					reviewedAt: input.submit && !approvalEnabled ? now : null,
					reviewNote: input.submit && !approvalEnabled ? AUTO_APPROVAL_MESSAGE : null,
				})),
			},
			comments: input.submit ? { create: [
				{ authorId: user.id, action: "SUBMIT", round: 0 },
				...(!approvalEnabled ? [{ authorId: user.id, action: "APPROVE" as const, message: AUTO_APPROVAL_MESSAGE, round: 0 }] : []),
			] } : undefined,
		},
		select: { id: true, title: true },
	});

	if (input.submit && approvalEnabled) {
		await notifyUsers(input.approverIds, {
			title: "Kalender konten baru menunggu review",
			message: `${user.name} mengajukan kalender "${cal.title}".`,
			link: linkOf(cal.id),
		});
	}
	return getCalendar(user, cal.id);
}

export async function updateCalendar(user: AuthUser, id: string, input: UpdateCalendarInput) {
	const existing = await findOwnEditable(user, id);
	if (input.approverIds) await assertValidApprovers(input.approverIds);

	const start = input.startDate ? parseDateOnly(input.startDate) : existing.startDate;
	const end = input.endDate ? parseDateOnly(input.endDate) : existing.endDate;
	if (end < start) throw badRequest("Tanggal selesai tidak boleh sebelum tanggal mulai");

	if (input.startDate || input.endDate) {
		const outside = await prisma.calendarItem.count({
			where: { calendarId: id, OR: [{ date: { lt: start } }, { date: { gt: end } }] },
		});
		if (outside > 0) throw badRequest("Masih ada jadwal di luar periode baru. Pindahkan atau hapus dulu.");
	}

	await prisma.$transaction(async (tx) => {
		await tx.calendar.update({
			where: { id },
			data: {
				title: input.title,
				description: input.description,
				startDate: input.startDate ? start : undefined,
				endDate: input.endDate ? end : undefined,
			},
		});
		if (input.approverIds) {
			await tx.calendarApprover.deleteMany({ where: { calendarId: id } });
			await tx.calendarApprover.createMany({
				data: [...new Set(input.approverIds)].map((approverId) => ({ calendarId: id, approverId })),
			});
		}
	});
	return getCalendar(user, id);
}

export async function deleteCalendar(user: AuthUser, id: string) {
	const cal = await prisma.calendar.findUnique({ where: { id }, select: { authorId: true, status: true } });
	if (!cal) throw notFound("Kalender tidak ditemukan");
	if (user.role === "SUPERADMIN") {
		await prisma.calendar.delete({ where: { id } });
		return;
	}
	if (cal.authorId !== user.id) throw notFound("Kalender tidak ditemukan");
	if (!EDITABLE.includes(cal.status)) throw badRequest("Kalender yang sedang direview atau sudah disetujui tidak dapat dihapus");
	await prisma.calendar.delete({ where: { id } });
}

// ── Item (jadwal per tanggal) ──────────────────────────────────────────────

export async function addItem(user: AuthUser, calendarId: string, input: ItemInput) {
	const cal = await findOwnEditable(user, calendarId);
	assertInRange(input.date, cal.startDate, cal.endDate);
	await assertOwnContent(user.id, input.contentId);

	const item = await prisma.calendarItem.create({
		data: {
			calendarId,
			date: parseDateOnly(input.date),
			title: input.title,
			platform: input.platform,
			format: input.format ?? null,
			notes: input.notes ?? null,
			contentId: input.contentId || null,
		},
	});
	return { ...item, date: toDateOnly(item.date) };
}

export async function updateItem(user: AuthUser, calendarId: string, itemId: string, input: UpdateItemInput) {
	const cal = await findOwnEditable(user, calendarId);
	const item = await prisma.calendarItem.findFirst({ where: { id: itemId, calendarId } });
	if (!item) throw notFound("Jadwal tidak ditemukan");
	if (input.date) assertInRange(input.date, cal.startDate, cal.endDate);
	if (input.contentId) await assertOwnContent(user.id, input.contentId);

	const updated = await prisma.calendarItem.update({
		where: { id: itemId },
		data: {
			date: input.date ? parseDateOnly(input.date) : undefined,
			title: input.title,
			platform: input.platform,
			format: input.format,
			notes: input.notes,
			contentId: input.contentId === undefined ? undefined : input.contentId || null,
			// Item yang diubah harus direview ulang
			status: "DRAFT",
		},
	});
	return { ...updated, date: toDateOnly(updated.date) };
}

export async function deleteItem(user: AuthUser, calendarId: string, itemId: string) {
	await findOwnEditable(user, calendarId);
	const res = await prisma.calendarItem.deleteMany({ where: { id: itemId, calendarId } });
	if (res.count === 0) throw notFound("Jadwal tidak ditemukan");
}

// ── Alur approval ──────────────────────────────────────────────────────────

export async function submitCalendar(user: AuthUser, id: string, message?: string | null) {
	const cal = await findOwnEditable(user, id);
	const approverIds = cal.approvers.map((a) => a.approverId);
	const { approvalEnabled } = await getApplicationSettings();
	assertRequiredApprovers(approvalEnabled, approverIds);
	if (approvalEnabled) await assertValidApprovers(approverIds);
	if (cal._count.items === 0) throw badRequest("Tambahkan minimal 1 jadwal konten sebelum mengajukan");

	const isResubmit = cal.status === "REVISION";
	const round = cal.revisionCount + (isResubmit ? 1 : 0);
	const now = new Date();

	await prisma.$transaction([
		// Tanggal yang sudah disetujui tetap disetujui; sisanya direview (ulang)
		prisma.calendarItem.updateMany({
			where: { calendarId: id, status: { in: ["DRAFT", "REJECTED", ...(!approvalEnabled ? ["PENDING" as const] : [])] } },
			data: {
				status: approvalEnabled ? "PENDING" : "APPROVED",
				reviewNote: approvalEnabled ? null : AUTO_APPROVAL_MESSAGE,
				reviewedById: null,
				reviewedAt: approvalEnabled ? null : now,
			},
		}),
		prisma.calendar.update({
			where: { id },
			data: {
				status: approvalEnabled ? "SUBMITTED" : "APPROVED",
				submittedAt: now,
				approvedAt: approvalEnabled ? null : now,
				revisionCount: round,
				comments: { create: [
					{ authorId: user.id, action: "SUBMIT", message: message ?? null, round },
					...(!approvalEnabled ? [{ authorId: user.id, action: "APPROVE" as const, message: AUTO_APPROVAL_MESSAGE, round }] : []),
				] },
			},
		}),
	]);

	if (approvalEnabled) await notifyUsers(approverIds, {
		title: isResubmit ? "Kalender direvisi & diajukan ulang" : "Kalender konten baru menunggu review",
		message: `${user.name} mengajukan kalender "${cal.title}"${isResubmit ? ` (revisi ke-${round})` : ""}.`,
		link: linkOf(id),
	});
	return getCalendar(user, id);
}

async function findReviewable(user: AuthUser, id: string) {
	const cal = await prisma.calendar.findFirst({
		where: { id, approvers: { some: { approverId: user.id } } },
	});
	if (!cal) throw notFound("Kalender tidak ditemukan");
	if (cal.status !== "SUBMITTED") throw badRequest("Kalender ini tidak sedang menunggu review");
	return cal;
}

/** Hitung ulang status kalender setelah tiap keputusan per tanggal */
async function finalize(calendar: { id: string; title: string; authorId: string }, reviewer: AuthUser) {
	const items = await prisma.calendarItem.findMany({ where: { calendarId: calendar.id }, select: { status: true } });
	const counts = itemCounts(items);
	if (counts.PENDING > 0 || counts.DRAFT > 0) return;

	const rejected = counts.REJECTED > 0;
	await prisma.calendar.update({
		where: { id: calendar.id },
		data: { status: rejected ? "REVISION" : "APPROVED", approvedAt: rejected ? null : new Date() },
	});
	await notifyUsers([calendar.authorId], {
		title: rejected ? "Kalender perlu revisi" : "Kalender disetujui 🎉",
		message: rejected
			? `${reviewer.name} menolak ${counts.REJECTED} tanggal pada "${calendar.title}". Cek catatannya lalu ajukan ulang.`
			: `Semua jadwal pada "${calendar.title}" disetujui oleh ${reviewer.name}.`,
		link: linkOf(calendar.id),
	});
}

export async function reviewItem(user: AuthUser, calendarId: string, itemId: string, input: { action: "APPROVE" | "REJECT"; note?: string | null }) {
	const cal = await findReviewable(user, calendarId);
	const item = await prisma.calendarItem.findFirst({ where: { id: itemId, calendarId } });
	if (!item) throw notFound("Jadwal tidak ditemukan");
	if (item.status !== "PENDING") throw badRequest("Tanggal ini sudah diputuskan");

	const approved = input.action === "APPROVE";
	await prisma.$transaction([
		prisma.calendarItem.update({
			where: { id: itemId },
			data: {
				status: approved ? "APPROVED" : "REJECTED",
				reviewNote: input.note ?? null,
				reviewedById: user.id,
				reviewedAt: new Date(),
			},
		}),
		prisma.calendarComment.create({
			data: {
				calendarId,
				itemId,
				authorId: user.id,
				action: input.action,
				message: input.note ?? null,
				round: cal.revisionCount,
			},
		}),
	]);

	await finalize(cal, user);
	return getCalendar(user, calendarId);
}

export async function approveAll(user: AuthUser, calendarId: string, note?: string | null) {
	const cal = await findReviewable(user, calendarId);
	await prisma.$transaction([
		prisma.calendarItem.updateMany({
			where: { calendarId, status: "PENDING" },
			data: { status: "APPROVED", reviewNote: note ?? null, reviewedById: user.id, reviewedAt: new Date() },
		}),
		prisma.calendarComment.create({
			data: {
				calendarId,
				authorId: user.id,
				action: "APPROVE",
				message: note ?? "Semua tanggal yang menunggu disetujui.",
				round: cal.revisionCount,
			},
		}),
	]);
	await finalize(cal, user);
	return getCalendar(user, calendarId);
}

export async function addComment(user: AuthUser, calendarId: string, message: string, itemId?: string) {
	const cal = await prisma.calendar.findFirst({
		where: { AND: [{ id: calendarId }, scopeWhere(user)] },
		include: { approvers: { select: { approverId: true } } },
	});
	if (!cal) throw notFound("Kalender tidak ditemukan");
	if (itemId) {
		const item = await prisma.calendarItem.findFirst({ where: { id: itemId, calendarId }, select: { id: true } });
		if (!item) throw notFound("Jadwal tidak ditemukan");
	}

	const comment = await prisma.calendarComment.create({
		data: { calendarId, itemId: itemId ?? null, authorId: user.id, action: "COMMENT", message, round: cal.revisionCount },
		include: {
			author: { select: publicUserSelect },
			item: { select: { id: true, title: true, date: true } },
		},
	});

	const recipients = user.id === cal.authorId ? cal.approvers.map((a) => a.approverId) : [cal.authorId];
	await notifyUsers(
		recipients,
		{
			title: "Komentar baru pada kalender",
			message: `${user.name} pada "${cal.title}": ${message.slice(0, 140)}`,
			link: linkOf(calendarId),
		},
		user.id,
	);
	return { ...comment, item: comment.item ? { ...comment.item, date: toDateOnly(comment.item.date) } : null };
}
