import { Router } from "express";
import { currentUser } from "../../common/utils";
import { listNotifications, markAllRead, markRead } from "./notification.service";

export const notificationRoutes = Router();

notificationRoutes.get("/", async (req, res) => {
	const data = await listNotifications(currentUser(req).id);
	res.json({ data: data.items, meta: { unreadCount: data.unreadCount } });
});

notificationRoutes.post("/read-all", async (req, res) => {
	await markAllRead(currentUser(req).id);
	res.json({ data: { ok: true } });
});

notificationRoutes.patch("/:id/read", async (req, res) => {
	await markRead(currentUser(req).id, String(req.params.id));
	res.json({ data: { ok: true } });
});
