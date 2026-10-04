import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../common/middleware/auth";
import { currentUser } from "../../common/utils";
import { changePasswordSchema, loginSchema, registerSchema, updateProfileSchema } from "./auth.schema";
import * as service from "./auth.service";

export const authRoutes = Router();

const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 30,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: { message: "Terlalu banyak percobaan, coba lagi beberapa menit lagi" },
});

authRoutes.post("/register", authLimiter, async (req, res) => {
	const result = await service.register(registerSchema.parse(req.body));
	res.status(201).json({ data: result });
});

authRoutes.post("/login", authLimiter, async (req, res) => {
	const result = await service.login(loginSchema.parse(req.body));
	res.json({ data: result });
});

authRoutes.get("/me", authenticate, async (req, res) => {
	res.json({ data: await service.me(currentUser(req).id) });
});

authRoutes.patch("/me", authenticate, async (req, res) => {
	const user = await service.updateProfile(currentUser(req).id, updateProfileSchema.parse(req.body));
	res.json({ data: user });
});

authRoutes.post("/change-password", authenticate, async (req, res) => {
	const input = changePasswordSchema.parse(req.body);
	await service.changePassword(currentUser(req).id, input.currentPassword, input.newPassword);
	res.json({ data: { ok: true } });
});
