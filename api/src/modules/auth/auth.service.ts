import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "../../common/errors";
import { userSelect } from "../users/user.service";
import type { LoginInput, RegisterInput, UpdateProfileInput } from "./auth.schema";

function signToken(user: { id: string; role: string }) {
	return jwt.sign({ role: user.role }, env.JWT_SECRET, {
		subject: user.id,
		expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
	});
}

export async function register(input: RegisterInput) {
	if (!env.ALLOW_REGISTER) throw forbidden("Pendaftaran mandiri dinonaktifkan");
	const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
	if (exists) throw conflict("Email sudah terdaftar");

	const user = await prisma.user.create({
		data: {
			name: input.name,
			email: input.email,
			phone: input.phone,
			passwordHash: await bcrypt.hash(input.password, 10),
			role: "USER",
		},
		select: userSelect,
	});
	return { token: signToken(user), user };
}

export async function login(input: LoginInput) {
	const found = await prisma.user.findUnique({ where: { email: input.email } });
	// Pesan sama untuk email salah / password salah agar tidak membocorkan keberadaan akun
	if (!found || !(await bcrypt.compare(input.password, found.passwordHash))) {
		throw unauthorized("Email atau password salah");
	}
	if (!found.isActive) throw forbidden("Akun Anda dinonaktifkan. Hubungi admin.");

	const user = await prisma.user.findUniqueOrThrow({ where: { id: found.id }, select: userSelect });
	return { token: signToken(user), user };
}

export async function me(userId: string) {
	const user = await prisma.user.findUnique({ where: { id: userId }, select: userSelect });
	if (!user) throw notFound("User tidak ditemukan");
	return user;
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
	return prisma.user.update({ where: { id: userId }, data: input, select: userSelect });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
	const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
	if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
		throw badRequest("Password saat ini salah");
	}
	await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
}
