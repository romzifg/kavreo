import { Router } from "express";
import { requireRole } from "../../common/middleware/auth";
import { currentUser } from "../../common/utils";
import { createUserSchema, listUsersQuery, updateUserSchema } from "./user.schema";
import * as service from "./user.service";

export const userRoutes = Router();

// Daftar approval aktif — dipakai user saat memilih approver (semua role login)
userRoutes.get("/approvers", async (_req, res) => {
	res.json({ data: await service.listApprovers() });
});

// Manajemen user — khusus SUPERADMIN
userRoutes.use(requireRole("SUPERADMIN"));

userRoutes.get("/", async (req, res) => {
	const query = listUsersQuery.parse(req.query);
	const { items, meta } = await service.listUsers(query);
	res.json({ data: items, meta });
});

userRoutes.post("/", async (req, res) => {
	const user = await service.createUser(createUserSchema.parse(req.body));
	res.status(201).json({ data: user });
});

userRoutes.patch("/:id", async (req, res) => {
	const user = await service.updateUser(String(req.params.id), updateUserSchema.parse(req.body), currentUser(req).id);
	res.json({ data: user });
});

userRoutes.delete("/:id", async (req, res) => {
	await service.deleteUser(String(req.params.id), currentUser(req).id);
	res.json({ data: { ok: true } });
});
