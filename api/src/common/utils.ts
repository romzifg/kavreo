import type { Request } from "express";
import { z } from "zod";
import { unauthorized } from "./errors";
import type { AuthUser } from "./types";

export function currentUser(req: Request): AuthUser {
	if (!req.user) throw unauthorized();
	return req.user;
}

export const paginationSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export function pageMeta(total: number, page: number, pageSize: number) {
	return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** "2026-10-04" -> Date UTC (untuk kolom @db.Date) */
export function parseDateOnly(value: string): Date {
	return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export const dateOnlySchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
	.refine((v) => !Number.isNaN(parseDateOnly(v).getTime()), "Tanggal tidak valid");

export const publicUserSelect = {
	id: true,
	name: true,
	email: true,
	role: true,
} as const;
