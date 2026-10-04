import { prisma } from "../../lib/prisma";
import type { AuthUser } from "../../common/types";
import { parseDateOnly, publicUserSelect, toDateOnly } from "../../common/utils";

type Counts = Record<"DRAFT" | "SUBMITTED" | "REVISION" | "APPROVED", number>;

const emptyCounts = (): Counts => ({ DRAFT: 0, SUBMITTED: 0, REVISION: 0, APPROVED: 0 });

async function contentCounts(where: object) {
	const groups = await prisma.content.groupBy({ by: ["type", "status"], where, _count: { _all: true } });
	const result = { SCRIPT: emptyCounts(), IDEA: emptyCounts() };
	for (const g of groups) result[g.type][g.status] = g._count._all;
	return result;
}

async function calendarCounts(where: object) {
	const groups = await prisma.calendar.groupBy({ by: ["status"], where, _count: { _all: true } });
	const result = emptyCounts();
	for (const g of groups) result[g.status] = g._count._all;
	return result;
}

export async function getDashboard(user: AuthUser) {
	const today = parseDateOnly(toDateOnly(new Date()));

	if (user.role === "USER") {
		const [contents, calendars, upcoming, needRevision] = await Promise.all([
			contentCounts({ authorId: user.id }),
			calendarCounts({ authorId: user.id }),
			prisma.calendarItem.findMany({
				where: { date: { gte: today }, calendar: { authorId: user.id } },
				orderBy: { date: "asc" },
				take: 6,
				include: { calendar: { select: { id: true, title: true } } },
			}),
			prisma.content.findMany({
				where: { authorId: user.id, status: "REVISION" },
				orderBy: { updatedAt: "desc" },
				take: 5,
				select: { id: true, type: true, title: true, updatedAt: true },
			}),
		]);
		const calendarsNeedRevision = await prisma.calendar.findMany({
			where: { authorId: user.id, status: "REVISION" },
			orderBy: { updatedAt: "desc" },
			take: 5,
			select: { id: true, title: true, updatedAt: true },
		});
		return {
			role: user.role,
			contents,
			calendars,
			upcoming: upcoming.map((i) => ({ ...i, date: toDateOnly(i.date) })),
			needRevision: { contents: needRevision, calendars: calendarsNeedRevision },
		};
	}

	if (user.role === "APPROVER") {
		const assigned = { approvers: { some: { approverId: user.id } } };
		const [pendingContents, pendingCalendars, contents, calendars] = await Promise.all([
			prisma.content.findMany({
				where: { ...assigned, status: "SUBMITTED" },
				orderBy: { submittedAt: "asc" },
				take: 6,
				select: { id: true, type: true, title: true, submittedAt: true, revisionCount: true, author: { select: publicUserSelect } },
			}),
			prisma.calendar.findMany({
				where: { ...assigned, status: "SUBMITTED" },
				orderBy: { submittedAt: "asc" },
				take: 6,
				select: { id: true, title: true, submittedAt: true, revisionCount: true, author: { select: publicUserSelect } },
			}),
			contentCounts({ ...assigned, status: { not: "DRAFT" } }),
			calendarCounts({ ...assigned, status: { not: "DRAFT" } }),
		]);
		return { role: user.role, contents, calendars, pending: { contents: pendingContents, calendars: pendingCalendars } };
	}

	// SUPERADMIN
	const [contents, calendars, usersByRole] = await Promise.all([
		contentCounts({}),
		calendarCounts({}),
		prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
	]);
	const users = { USER: 0, APPROVER: 0, SUPERADMIN: 0 };
	for (const g of usersByRole) users[g.role] = g._count._all;
	return { role: user.role, contents, calendars, users };
}
