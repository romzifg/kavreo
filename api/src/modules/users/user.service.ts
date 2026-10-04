import bcrypt from "bcryptjs";
import type { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, notFound } from "../../common/errors";
import { pageMeta } from "../../common/utils";
import type { CreateUserInput, UpdateUserInput } from "./user.schema";

export const userSelect = {
	id: true,
	name: true,
	email: true,
	phone: true,
	role: true,
	isActive: true,
	notifyEmail: true,
	notifyWhatsapp: true,
	createdAt: true,
} satisfies Prisma.UserSelect;

export async function listUsers(params: { q?: string; role?: "USER" | "APPROVER" | "SUPERADMIN"; page: number; pageSize: number }) {
	const where: Prisma.UserWhereInput = {
		...(params.role ? { role: params.role } : {}),
		...(params.q
			? {
					OR: [{ name: { contains: params.q, mode: "insensitive" } }, { email: { contains: params.q, mode: "insensitive" } }],
				}
			: {}),
	};
	const [items, total] = await Promise.all([
		prisma.user.findMany({
			where,
			select: userSelect,
			orderBy: { createdAt: "desc" },
			skip: (params.page - 1) * params.pageSize,
			take: params.pageSize,
		}),
		prisma.user.count({ where }),
	]);
	return { items, meta: pageMeta(total, params.page, params.pageSize) };
}

export function listApprovers() {
	return prisma.user.findMany({
		where: { role: "APPROVER", isActive: true },
		select: { id: true, name: true, email: true },
		orderBy: { name: "asc" },
	});
}

export async function createUser(input: CreateUserInput) {
	const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
	if (exists) throw conflict("Email sudah terdaftar");
	return prisma.user.create({
		data: {
			name: input.name,
			email: input.email,
			phone: input.phone,
			role: input.role,
			passwordHash: await bcrypt.hash(input.password, 10),
		},
		select: userSelect,
	});
}

export async function updateUser(id: string, input: UpdateUserInput, actorId: string) {
	const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
	if (!user) throw notFound("User tidak ditemukan");

	if (id === actorId && (input.role || input.isActive === false)) {
		throw badRequest("Anda tidak dapat mengubah role atau menonaktifkan akun sendiri");
	}
	if (input.email) {
		const dup = await prisma.user.findFirst({ where: { email: input.email, NOT: { id } }, select: { id: true } });
		if (dup) throw conflict("Email sudah dipakai user lain");
	}

	const { password, ...rest } = input;
	return prisma.user.update({
		where: { id },
		data: { ...rest, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) },
		select: userSelect,
	});
}

export async function deleteUser(id: string, actorId: string) {
	if (id === actorId) throw badRequest("Anda tidak dapat menghapus akun sendiri");
	const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
	if (!user) throw notFound("User tidak ditemukan");
	await prisma.user.delete({ where: { id } });
}
