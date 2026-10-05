import type { ContentType, Prisma, ReviewStatus } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, forbidden, notFound } from "../../common/errors";
import type { AuthUser } from "../../common/types";
import { pageMeta, publicUserSelect } from "../../common/utils";
import { notifyUsers } from "../notifications/notification.service";
import type { CreateContentInput, UpdateContentInput } from "./content.schema";
import { richTextHasContent } from "../../common/rich-text";
import { AUTO_APPROVAL_MESSAGE, assertRequiredApprovers } from "../../common/approval";
import { getApplicationSettings } from "../settings/settings.service";

const TYPE_LABEL: Record<ContentType, string> = { SCRIPT: "Script", IDEA: "Ide konten" };
const TYPE_PATH: Record<ContentType, string> = { SCRIPT: "/scripts", IDEA: "/ideas" };
const EDITABLE: ReviewStatus[] = ["DRAFT", "REVISION"];

const listInclude = {
	author: { select: publicUserSelect },
	approvers: { include: { approver: { select: publicUserSelect } } },
	_count: { select: { comments: true } },
} satisfies Prisma.ContentInclude;

const detailInclude = {
	...listInclude,
	comments: {
		orderBy: { createdAt: "asc" as const },
		include: { author: { select: publicUserSelect } },
	},
} satisfies Prisma.ContentInclude;

type WithApprovers = { approvers: { approver: { id: string; name: string; email: string; role: string } }[] };

function serialize<T extends WithApprovers>(content: T) {
	const { approvers, ...rest } = content;
	return { ...rest, approvers: approvers.map((a) => a.approver) };
}

/** Batas data yang boleh dilihat tiap role */
function scopeWhere(user: AuthUser): Prisma.ContentWhereInput {
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

function assertSubmittable(
	data: { type: ContentType; hook?: string | null; body?: string | null; description?: string | null },
	approverIds: string[],
	approvalEnabled: boolean,
) {
	assertRequiredApprovers(approvalEnabled, approverIds);
	if (data.type === "SCRIPT" && !(data.hook?.trim() || richTextHasContent(data.body))) {
		throw badRequest("Isi hook atau isi script sebelum mengajukan");
	}
	if (data.type === "IDEA" && !richTextHasContent(data.description)) {
		throw badRequest("Isi deskripsi ide sebelum mengajukan");
	}
}

export async function listContents(user: AuthUser, q: { type?: ContentType; status?: ReviewStatus; q?: string; page: number; pageSize: number }) {
	const where: Prisma.ContentWhereInput = {
		AND: [
			scopeWhere(user),
			q.type ? { type: q.type } : {},
			q.status ? { status: q.status } : {},
			q.q
				? {
						OR: [
							{ title: { contains: q.q, mode: "insensitive" } },
							{ category: { contains: q.q, mode: "insensitive" } },
							{ hashtags: { has: q.q.replace(/^#/, "") } },
						],
					}
				: {},
		],
	};
	const [items, total] = await Promise.all([
		prisma.content.findMany({
			where,
			include: listInclude,
			orderBy: { updatedAt: "desc" },
			skip: (q.page - 1) * q.pageSize,
			take: q.pageSize,
		}),
		prisma.content.count({ where }),
	]);
	return { items: items.map(serialize), meta: pageMeta(total, q.page, q.pageSize) };
}

export async function getContent(user: AuthUser, id: string) {
	const content = await prisma.content.findFirst({
		where: { AND: [{ id }, scopeWhere(user)] },
		include: detailInclude,
	});
	if (!content) throw notFound("Data tidak ditemukan");
	return serialize(content);
}

export async function createContent(user: AuthUser, input: CreateContentInput) {
	await assertValidApprovers(input.approverIds);
	const { approvalEnabled } = await getApplicationSettings();
	if (input.submit) assertSubmittable(input, input.approverIds, approvalEnabled);

	const { approverIds, submit, ...data } = input;
	const now = new Date();
	const content = await prisma.content.create({
		data: {
			...data,
			durationSec: data.durationSec ?? null,
			authorId: user.id,
			status: submit ? (approvalEnabled ? "SUBMITTED" : "APPROVED") : "DRAFT",
			submittedAt: submit ? now : null,
			approvedAt: submit && !approvalEnabled ? now : null,
			approvers: { create: [...new Set(approverIds)].map((approverId) => ({ approverId })) },
			comments: submit ? { create: [
				{ authorId: user.id, action: "SUBMIT", round: 0 },
				...(!approvalEnabled ? [{ authorId: user.id, action: "APPROVE" as const, message: AUTO_APPROVAL_MESSAGE, round: 0 }] : []),
			] } : undefined,
		},
		include: detailInclude,
	});

	if (submit && approvalEnabled) {
		await notifyUsers(approverIds, {
			title: `${TYPE_LABEL[content.type]} baru menunggu review`,
			message: `${user.name} mengajukan "${content.title}".`,
			link: `${TYPE_PATH[content.type]}/${content.id}`,
		});
	}
	return serialize(content);
}

async function findOwn(user: AuthUser, id: string) {
	const content = await prisma.content.findUnique({
		where: { id },
		include: { approvers: { select: { approverId: true } } },
	});
	if (!content || content.authorId !== user.id) throw notFound("Data tidak ditemukan");
	return content;
}

export async function updateContent(user: AuthUser, id: string, input: UpdateContentInput) {
	const existing = await findOwn(user, id);
	if (!EDITABLE.includes(existing.status)) {
		throw badRequest("Data yang sedang direview atau sudah disetujui tidak dapat diedit");
	}
	if (input.approverIds) await assertValidApprovers(input.approverIds);

	const { approverIds, ...data } = input;
	await prisma.$transaction(async (tx) => {
		await tx.content.update({
			where: { id },
			data: { ...data, durationSec: data.durationSec === undefined ? undefined : data.durationSec },
		});
		if (approverIds) {
			await tx.contentApprover.deleteMany({ where: { contentId: id } });
			await tx.contentApprover.createMany({
				data: [...new Set(approverIds)].map((approverId) => ({ contentId: id, approverId })),
			});
		}
	});
	return getContent(user, id);
}

export async function deleteContent(user: AuthUser, id: string) {
	const content = await prisma.content.findUnique({ where: { id }, select: { authorId: true, status: true } });
	if (!content) throw notFound("Data tidak ditemukan");
	if (user.role === "SUPERADMIN") {
		await prisma.content.delete({ where: { id } });
		return;
	}
	if (content.authorId !== user.id) throw notFound("Data tidak ditemukan");
	if (!EDITABLE.includes(content.status)) throw badRequest("Data yang sedang direview atau sudah disetujui tidak dapat dihapus");
	await prisma.content.delete({ where: { id } });
}

export async function submitContent(user: AuthUser, id: string, message?: string | null) {
	const content = await findOwn(user, id);
	if (!EDITABLE.includes(content.status)) throw badRequest("Data ini sudah diajukan");
	const approverIds = content.approvers.map((a) => a.approverId);
	const { approvalEnabled } = await getApplicationSettings();
	assertSubmittable(content, approverIds, approvalEnabled);
	if (approvalEnabled) await assertValidApprovers(approverIds);

	const isResubmit = content.status === "REVISION";
	const round = content.revisionCount + (isResubmit ? 1 : 0);
	const now = new Date();

	await prisma.content.update({
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
	});

	if (approvalEnabled) await notifyUsers(approverIds, {
		title: isResubmit ? `${TYPE_LABEL[content.type]} direvisi & diajukan ulang` : `${TYPE_LABEL[content.type]} baru menunggu review`,
		message: `${user.name} mengajukan "${content.title}"${isResubmit ? ` (revisi ke-${round})` : ""}.`,
		link: `${TYPE_PATH[content.type]}/${id}`,
	});
	return getContent(user, id);
}

export async function reviewContent(user: AuthUser, id: string, input: { action: "APPROVE" | "REJECT"; message?: string | null }) {
	const content = await prisma.content.findFirst({
		where: { id, approvers: { some: { approverId: user.id } } },
	});
	if (!content) throw notFound("Data tidak ditemukan");
	if (content.status !== "SUBMITTED") throw badRequest("Data ini tidak sedang menunggu review");

	const approved = input.action === "APPROVE";
	await prisma.content.update({
		where: { id },
		data: {
			status: approved ? "APPROVED" : "REVISION",
			approvedAt: approved ? new Date() : null,
			comments: {
				create: { authorId: user.id, action: input.action, message: input.message ?? null, round: content.revisionCount },
			},
		},
	});

	await notifyUsers([content.authorId], {
		title: approved ? `${TYPE_LABEL[content.type]} disetujui 🎉` : `${TYPE_LABEL[content.type]} perlu revisi`,
		message: approved
			? `"${content.title}" disetujui oleh ${user.name}.`
			: `${user.name} meminta revisi untuk "${content.title}": ${input.message}`,
		link: `${TYPE_PATH[content.type]}/${id}`,
	});
	return getContent(user, id);
}

export async function addComment(user: AuthUser, id: string, message: string) {
	const content = await prisma.content.findFirst({
		where: { AND: [{ id }, scopeWhere(user)] },
		include: { approvers: { select: { approverId: true } } },
	});
	if (!content) throw notFound("Data tidak ditemukan");
	if (user.role !== "SUPERADMIN" && content.authorId !== user.id && !content.approvers.some((a) => a.approverId === user.id)) {
		throw forbidden();
	}

	const comment = await prisma.contentComment.create({
		data: { contentId: id, authorId: user.id, action: "COMMENT", message, round: content.revisionCount },
		include: { author: { select: publicUserSelect } },
	});

	const recipients = user.id === content.authorId ? content.approvers.map((a) => a.approverId) : [content.authorId];
	await notifyUsers(
		recipients,
		{
			title: `Komentar baru pada ${TYPE_LABEL[content.type].toLowerCase()}`,
			message: `${user.name} pada "${content.title}": ${message.slice(0, 140)}`,
			link: `${TYPE_PATH[content.type]}/${id}`,
		},
		user.id,
	);
	return comment;
}
