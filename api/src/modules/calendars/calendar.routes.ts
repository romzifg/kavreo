import { Router } from "express";
import { requireRole } from "../../common/middleware/auth";
import { currentUser } from "../../common/utils";
import {
	approveAllSchema,
	calendarCommentSchema,
	createCalendarSchema,
	itemSchema,
	listCalendarsQuery,
	reviewItemSchema,
	submitCalendarSchema,
	updateCalendarSchema,
	updateItemSchema,
} from "./calendar.schema";
import * as service from "./calendar.service";

export const calendarRoutes = Router();

calendarRoutes.get("/", async (req, res) => {
	const { items, meta } = await service.listCalendars(currentUser(req), listCalendarsQuery.parse(req.query));
	res.json({ data: items, meta });
});

calendarRoutes.post("/", requireRole("USER"), async (req, res) => {
	const cal = await service.createCalendar(currentUser(req), createCalendarSchema.parse(req.body));
	res.status(201).json({ data: cal });
});

calendarRoutes.get("/:id", async (req, res) => {
	res.json({ data: await service.getCalendar(currentUser(req), String(req.params.id)) });
});

calendarRoutes.patch("/:id", requireRole("USER"), async (req, res) => {
	const cal = await service.updateCalendar(currentUser(req), String(req.params.id), updateCalendarSchema.parse(req.body));
	res.json({ data: cal });
});

calendarRoutes.delete("/:id", requireRole("USER", "SUPERADMIN"), async (req, res) => {
	await service.deleteCalendar(currentUser(req), String(req.params.id));
	res.json({ data: { ok: true } });
});

// Jadwal per tanggal
calendarRoutes.post("/:id/items", requireRole("USER"), async (req, res) => {
	const item = await service.addItem(currentUser(req), String(req.params.id), itemSchema.parse(req.body));
	res.status(201).json({ data: item });
});

calendarRoutes.patch("/:id/items/:itemId", requireRole("USER"), async (req, res) => {
	const item = await service.updateItem(currentUser(req), String(req.params.id), String(req.params.itemId), updateItemSchema.parse(req.body));
	res.json({ data: item });
});

calendarRoutes.delete("/:id/items/:itemId", requireRole("USER"), async (req, res) => {
	await service.deleteItem(currentUser(req), String(req.params.id), String(req.params.itemId));
	res.json({ data: { ok: true } });
});

// Pengajuan & review
calendarRoutes.post("/:id/submit", requireRole("USER"), async (req, res) => {
	const { message } = submitCalendarSchema.parse(req.body ?? {});
	res.json({ data: await service.submitCalendar(currentUser(req), String(req.params.id), message) });
});

calendarRoutes.post("/:id/items/:itemId/review", requireRole("APPROVER"), async (req, res) => {
	const input = reviewItemSchema.parse(req.body);
	res.json({
		data: await service.reviewItem(currentUser(req), String(req.params.id), String(req.params.itemId), input),
	});
});

calendarRoutes.post("/:id/approve-all", requireRole("APPROVER"), async (req, res) => {
	const { note } = approveAllSchema.parse(req.body ?? {});
	res.json({ data: await service.approveAll(currentUser(req), String(req.params.id), note) });
});

calendarRoutes.post("/:id/comments", async (req, res) => {
	const { message, itemId } = calendarCommentSchema.parse(req.body);
	const comment = await service.addComment(currentUser(req), String(req.params.id), message, itemId);
	res.status(201).json({ data: comment });
});
