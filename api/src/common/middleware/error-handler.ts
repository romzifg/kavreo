import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { isProd } from "../../config/env";
import { logger } from "../../lib/logger";
import { AppError } from "../errors";

export function notFoundHandler(_req: Request, res: Response) {
	res.status(404).json({ message: "Endpoint tidak ditemukan" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
	if (err instanceof ZodError) {
		return res.status(422).json({
			message: "Data yang dikirim tidak valid",
			errors: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
		});
	}

	if (err instanceof AppError) {
		return res.status(err.status).json({ message: err.message, details: err.details });
	}

	if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") return res.status(409).json({ message: "Data sudah ada (duplikat)" });
		if (err.code === "P2025") return res.status(404).json({ message: "Data tidak ditemukan" });
	}

	logger.error({ err, path: req.path }, "Unhandled error");
	res.status(500).json({
		message: "Terjadi kesalahan pada server",
		...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
	});
}
