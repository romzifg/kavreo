import { z } from "zod";

export const registerSchema = z.object({
	name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
	email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
	phone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s-]{8,20}$/, "Nomor telepon tidak valid")
		.optional()
		.or(z.literal("").transform(() => undefined)),
	password: z.string().min(8, "Password minimal 8 karakter").max(72),
});

export const loginSchema = z.object({
	email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
	password: z.string().min(1, "Password wajib diisi"),
});

export const updateProfileSchema = z.object({
	name: z.string().trim().min(2).max(80).optional(),
	phone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s-]{8,20}$/, "Nomor telepon tidak valid")
		.nullable()
		.optional()
		.or(z.literal("").transform(() => null)),
	notifyEmail: z.boolean().optional(),
	notifyWhatsapp: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
	currentPassword: z.string().min(1, "Password saat ini wajib diisi"),
	newPassword: z.string().min(8, "Password baru minimal 8 karakter").max(72),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
