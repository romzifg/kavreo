import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "../../generated/prisma/client";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { forbidden, unauthorized } from "../errors";

interface TokenPayload {
	sub: string;
	role: Role;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
	const header = req.headers.authorization;
	if (!header?.startsWith("Bearer ")) throw unauthorized();

	let payload: TokenPayload;
	try {
		payload = jwt.verify(header.slice(7), env.JWT_SECRET) as unknown as TokenPayload;
	} catch {
		throw unauthorized("Sesi berakhir, silakan login kembali");
	}

	const user = await prisma.user.findUnique({
		where: { id: payload.sub },
		select: { id: true, name: true, email: true, role: true, isActive: true },
	});
	if (!user || !user.isActive) throw unauthorized("Akun tidak aktif");

	req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
	next();
}

export function requireRole(...roles: Role[]) {
	return (req: Request, _res: Response, next: NextFunction) => {
		if (!req.user) throw unauthorized();
		if (!roles.includes(req.user.role)) throw forbidden();
		next();
	};
}
