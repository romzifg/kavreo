import { z } from "zod";
import { paginationSchema } from "../../common/utils";
import { sanitizeRichText } from "../../common/rich-text";

export const platformEnum = z.enum(["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS", "FACEBOOK_REELS", "OTHER"]);
export const contentTypeEnum = z.enum(["SCRIPT", "IDEA"]);
export const reviewStatusEnum = z.enum(["DRAFT", "SUBMITTED", "REVISION", "APPROVED"]);

/** String opsional: "" -> null, undefined tetap undefined (aman untuk PATCH) */
const optText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Maksimal ${max} karakter`)
		.nullish()
		.transform((v) => (v === undefined ? undefined : v || null));

const hashtags = z
	.array(z.string().trim())
	.max(15, "Maksimal 15 hashtag")
	.transform((list) => [...new Set(list.map((h) => h.replace(/^#+/, "").replace(/\s+/g, "")).filter(Boolean))]);

const optRichText = (max: number) =>
	z
		.string()
		.trim()
		.max(max, `Maksimal ${max} karakter termasuk format`)
		.nullish()
		.transform((value) => (value === undefined ? undefined : value ? sanitizeRichText(value) || null : null));

const fields = {
	title: z.string().trim().min(3, "Judul minimal 3 karakter").max(160, "Judul maksimal 160 karakter"),
	platform: platformEnum.default("TIKTOK"),
	category: optText(60),
	hook: optText(500),
	body: optRichText(10000),
	cta: optText(300),
	tone: optText(60),
	durationSec: z.coerce.number().int().min(5).max(900).nullish(),
	description: optRichText(5000),
	hashtags: hashtags.default([]),
	approverIds: z.array(z.string()).default([]),
};

export const createContentSchema = z.object({
	type: contentTypeEnum,
	...fields,
	submit: z.boolean().default(false),
});

export const updateContentSchema = z.object({
	title: fields.title.optional(),
	platform: platformEnum.optional(),
	category: fields.category,
	hook: fields.hook,
	body: fields.body,
	cta: fields.cta,
	tone: fields.tone,
	durationSec: fields.durationSec,
	description: fields.description,
	hashtags: hashtags.optional(),
	approverIds: z.array(z.string()).optional(),
});

export const submitSchema = z.object({
	message: optText(1000),
});

export const reviewSchema = z
	.object({
		action: z.enum(["APPROVE", "REJECT"]),
		message: optText(2000),
	})
	.refine((v) => v.action !== "REJECT" || (v.message && v.message.length >= 3), {
		path: ["message"],
		message: "Alasan penolakan wajib diisi agar user tahu apa yang perlu diperbaiki",
	});

export const commentSchema = z.object({
	message: z.string().trim().min(1, "Komentar tidak boleh kosong").max(2000),
});

export const listContentsQuery = paginationSchema.extend({
	type: contentTypeEnum.optional(),
	status: reviewStatusEnum.optional(),
	q: z.string().trim().optional(),
});

export type CreateContentInput = z.infer<typeof createContentSchema>;
export type UpdateContentInput = z.infer<typeof updateContentSchema>;
