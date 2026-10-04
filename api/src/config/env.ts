import "dotenv/config";
import { z } from "zod";

const bool = z.union([z.boolean(), z.string()]).transform((v) => (typeof v === "boolean" ? v : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(4000),
	CORS_ORIGIN: z.string().default("http://localhost:5173"),
	APP_URL: z.string().default("http://localhost:5173"),
	TRUST_PROXY: z.coerce.number().int().min(0).default(0),

	DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),

	JWT_SECRET: z.string().min(16, "JWT_SECRET minimal 16 karakter"),
	JWT_EXPIRES_IN: z.string().default("7d"),
	ALLOW_REGISTER: bool.default(true),

	NOTIFY_EMAIL_ENABLED: bool.default(false),
	NOTIFY_WHATSAPP_ENABLED: bool.default(false),

	SMTP_HOST: z.string().optional().default(""),
	SMTP_PORT: z.coerce.number().int().default(587),
	SMTP_SECURE: bool.default(false),
	SMTP_USER: z.string().optional().default(""),
	SMTP_PASS: z.string().optional().default(""),
	SMTP_FROM: z.string().default("Content Planner <no-reply@example.com>"),

	WA_PROVIDER: z.enum(["fonnte", "webhook"]).default("fonnte"),
	WA_API_URL: z.string().optional().default(""),
	WA_API_TOKEN: z.string().optional().default(""),

	SEED_ADMIN_NAME: z.string().default("Super Admin"),
	SEED_ADMIN_EMAIL: z.string().default("admin@contentplanner.test"),
	SEED_ADMIN_PASSWORD: z.string().default("Admin12345!"),
	SEED_DEMO_DATA: bool.default(true),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
	console.error("Konfigurasi environment tidak valid:");
	for (const issue of parsed.error.issues) {
		console.error(` - ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
