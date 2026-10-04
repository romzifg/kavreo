import { Router } from "express";
import { requireRole } from "../../common/middleware/auth";
import { currentUser } from "../../common/utils";
import { commentSchema, createContentSchema, listContentsQuery, reviewSchema, submitSchema, updateContentSchema } from "./content.schema";
import * as service from "./content.service";

export const contentRoutes = Router();

contentRoutes.get("/", async (req, res) => {
	const { items, meta } = await service.listContents(currentUser(req), listContentsQuery.parse(req.query));
	res.json({ data: items, meta });
});

contentRoutes.post("/", requireRole("USER"), async (req, res) => {
	const content = await service.createContent(currentUser(req), createContentSchema.parse(req.body));
	res.status(201).json({ data: content });
});

contentRoutes.get("/:id", async (req, res) => {
	res.json({ data: await service.getContent(currentUser(req), String(req.params.id)) });
});

contentRoutes.patch("/:id", requireRole("USER"), async (req, res) => {
	const content = await service.updateContent(currentUser(req), String(req.params.id), updateContentSchema.parse(req.body));
	res.json({ data: content });
});

contentRoutes.delete("/:id", requireRole("USER", "SUPERADMIN"), async (req, res) => {
	await service.deleteContent(currentUser(req), String(req.params.id));
	res.json({ data: { ok: true } });
});

// User mengajukan (atau mengajukan ulang setelah revisi)
contentRoutes.post("/:id/submit", requireRole("USER"), async (req, res) => {
	const { message } = submitSchema.parse(req.body ?? {});
	res.json({ data: await service.submitContent(currentUser(req), String(req.params.id), message) });
});

// Approval menyetujui / menolak (kembali ke user)
contentRoutes.post("/:id/review", requireRole("APPROVER"), async (req, res) => {
	const input = reviewSchema.parse(req.body);
	res.json({ data: await service.reviewContent(currentUser(req), String(req.params.id), input) });
});

contentRoutes.post("/:id/comments", async (req, res) => {
	const { message } = commentSchema.parse(req.body);
	const comment = await service.addComment(currentUser(req), String(req.params.id), message);
	res.status(201).json({ data: comment });
});
