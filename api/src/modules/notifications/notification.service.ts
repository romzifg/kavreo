import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { notFound } from "../../common/errors";
import { emailConfigured, sendEmail } from "./channels/email.channel";
import { sendWhatsapp, whatsappConfigured } from "./channels/whatsapp.channel";

export interface NotifyPayload {
	title: string;
	message: string;
	/** Path di frontend, mis. /scripts/abc123 */
	link?: string;
}

/**
 * Simpan notifikasi in-app, lalu kirim ke email / WhatsApp jika:
 *  1. channel diaktifkan di .env (NOTIFY_EMAIL_ENABLED / NOTIFY_WHATSAPP_ENABLED), dan
 *  2. user mengaktifkan channel tersebut di pengaturannya.
 * Pengiriman eksternal berjalan di latar belakang & tidak pernah menggagalkan request.
 */
export async function notifyUsers(userIds: string[], payload: NotifyPayload, exceptUserId?: string) {
	const ids = [...new Set(userIds)].filter((id) => id !== exceptUserId);
	if (ids.length === 0) return;

	try {
		await prisma.notification.createMany({
			data: ids.map((userId) => ({ userId, ...payload })),
		});
	} catch (err) {
		logger.error({ err }, "Gagal menyimpan notifikasi");
		return;
	}

	const emailOn = emailConfigured();
	const waOn = whatsappConfigured();
	if (!emailOn && !waOn) return;

	void (async () => {
		const users = await prisma.user.findMany({
			where: { id: { in: ids }, isActive: true },
			select: { email: true, phone: true, notifyEmail: true, notifyWhatsapp: true },
		});

		await Promise.allSettled(
			users.flatMap((u) => {
				const jobs: Promise<void>[] = [];
				if (emailOn && u.notifyEmail) {
					jobs.push(
						sendEmail(u.email, payload.title, payload.message, payload.link).catch((err) =>
							logger.error({ err, to: u.email }, "Gagal kirim email notifikasi"),
						),
					);
				}
				if (waOn && u.notifyWhatsapp && u.phone) {
					jobs.push(
						sendWhatsapp(u.phone, payload.title, payload.message, payload.link).catch((err) =>
							logger.error({ err }, "Gagal kirim WhatsApp notifikasi"),
						),
					);
				}
				return jobs;
			}),
		);
	})();
}

export async function listNotifications(userId: string) {
	const [items, unreadCount] = await Promise.all([
		prisma.notification.findMany({
			where: { userId },
			orderBy: { createdAt: "desc" },
			take: 50,
		}),
		prisma.notification.count({ where: { userId, readAt: null } }),
	]);
	return { items, unreadCount };
}

export async function markRead(userId: string, id: string) {
	const res = await prisma.notification.updateMany({
		where: { id, userId, readAt: null },
		data: { readAt: new Date() },
	});
	if (res.count === 0) {
		const exists = await prisma.notification.findFirst({ where: { id, userId }, select: { id: true } });
		if (!exists) throw notFound("Notifikasi tidak ditemukan");
	}
}

export async function markAllRead(userId: string) {
	await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
