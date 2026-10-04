import { env } from "../../../config/env";

export function whatsappConfigured() {
	return env.NOTIFY_WHATSAPP_ENABLED && Boolean(env.WA_API_TOKEN || env.WA_API_URL);
}

/** 0812xxxx / +62812xxxx / 62812xxxx -> 62812xxxx */
export function normalizePhone(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.startsWith("62")) return digits;
	if (digits.startsWith("0")) return `62${digits.slice(1)}`;
	return digits;
}

export async function sendWhatsapp(phone: string, title: string, message: string, link?: string) {
	const to = normalizePhone(phone);
	const url = link ? `${env.APP_URL.replace(/\/$/, "")}${link}` : "";
	const text = [`*${title}*`, message, url].filter(Boolean).join("\n\n");

	if (env.WA_PROVIDER === "fonnte") {
		// https://docs.fonnte.com — token dikirim lewat header Authorization
		const form = new FormData();
		form.append("target", to);
		form.append("message", text);
		const res = await fetch(env.WA_API_URL || "https://api.fonnte.com/send", {
			method: "POST",
			headers: { Authorization: env.WA_API_TOKEN },
			body: form,
		});
		if (!res.ok) throw new Error(`WhatsApp (fonnte) gagal: HTTP ${res.status}`);
		return;
	}

	// Provider generik: kirim JSON ke webhook milik Anda (mis. gateway internal / n8n)
	const res = await fetch(env.WA_API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(env.WA_API_TOKEN ? { Authorization: `Bearer ${env.WA_API_TOKEN}` } : {}),
		},
		body: JSON.stringify({ to, message: text, title, link: url || undefined }),
	});
	if (!res.ok) throw new Error(`WhatsApp (webhook) gagal: HTTP ${res.status}`);
}
