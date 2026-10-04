import { z } from "zod";
import { paginationSchema } from "../../common/utils";

const roleEnum = z.enum(["USER", "APPROVER", "SUPERADMIN"]);

const phone = z
	.string()
	.trim()
	.regex(/^\+?[0-9\s-]{8,20}$/, "Nomor telepon tidak valid")
	.optional()
	.or(z.literal("").transform(() => undefined));

export const createUserSchema = z.object({
	name: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
	email: z.email("Email tidak valid").transform((v) => v.toLowerCase()),
	phone,
	password: z.string().min(8, "Password minimal 8 karakter").max(72),
	role: roleEnum.default("USER"),
});

export const updateUserSchema = z.object({
	name: z.string().trim().min(2).max(80).optional(),
	email: z
		.email()
		.transform((v) => v.toLowerCase())
		.optional(),
	phone: z.string().trim().max(20).nullable().optional(),
	password: z.string().min(8).max(72).optional(),
	role: roleEnum.optional(),
	isActive: z.boolean().optional(),
});

export const listUsersQuery = paginationSchema.extend({
	q: z.string().trim().optional(),
	role: roleEnum.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
