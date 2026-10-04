import { z } from "zod";
import { dateOnlySchema, paginationSchema, parseDateOnly } from "../../common/utils";
import { platformEnum, reviewStatusEnum } from "../contents/content.schema";

const optText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Maksimal ${max} karakter`)
		.nullish()
		.transform((v) => (v === undefined ? undefined : v || null));

export const itemSchema = z.object({
	date: dateOnlySchema,
	title: z.string().trim().min(2, "Judul minimal 2 karakter").max(160),
	platform: platformEnum.default("TIKTOK"),
	format: optText(60),
	notes: optText(2000),
	contentId: z.string().nullish(),
});

export const updateItemSchema = z.object({
	date: dateOnlySchema.optional(),
	title: z.string().trim().min(2).max(160).optional(),
	platform: platformEnum.optional(),
	format: optText(60),
	notes: optText(2000),
	contentId: z.string().nullish(),
});

const rangeCheck = (v: { startDate?: string; endDate?: string }) =>
	!v.startDate || !v.endDate || parseDateOnly(v.endDate) >= parseDateOnly(v.startDate);
const rangeMessage = { path: ["endDate"], message: "Tanggal selesai tidak boleh sebelum tanggal mulai" };

export const createCalendarSchema = z
	.object({
		title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160),
		description: optText(3000),
		startDate: dateOnlySchema,
		endDate: dateOnlySchema,
		approverIds: z.array(z.string()).default([]),
		items: z.array(itemSchema).max(200).default([]),
		submit: z.boolean().default(false),
	})
	.refine(rangeCheck, rangeMessage);

export const updateCalendarSchema = z
	.object({
		title: z.string().trim().min(3).max(160).optional(),
		description: optText(3000),
		startDate: dateOnlySchema.optional(),
		endDate: dateOnlySchema.optional(),
		approverIds: z.array(z.string()).optional(),
	})
	.refine(rangeCheck, rangeMessage);

export const submitCalendarSchema = z.object({ message: optText(1000) });

export const reviewItemSchema = z
	.object({
		action: z.enum(["APPROVE", "REJECT"]),
		note: optText(2000),
	})
	.refine((v) => v.action !== "REJECT" || (v.note && v.note.length >= 3), {
		path: ["note"],
		message: "Catatan penolakan wajib diisi untuk tanggal yang ditolak",
	});

export const approveAllSchema = z.object({ note: optText(2000) });

export const calendarCommentSchema = z.object({
	message: z.string().trim().min(1, "Komentar tidak boleh kosong").max(2000),
	itemId: z.string().optional(),
});

export const listCalendarsQuery = paginationSchema.extend({
	status: reviewStatusEnum.optional(),
	q: z.string().trim().optional(),
});

export type CreateCalendarInput = z.infer<typeof createCalendarSchema>;
export type UpdateCalendarInput = z.infer<typeof updateCalendarSchema>;
export type ItemInput = z.infer<typeof itemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
