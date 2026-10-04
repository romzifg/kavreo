import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
	if (!transporter) {
		transporter = nodemailer.createTransport({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
		});
	}
	return transporter;
}

export function emailConfigured() {
	return env.NOTIFY_EMAIL_ENABLED && Boolean(env.SMTP_HOST);
}

function escapeHtml(s: string) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendEmail(to: string, title: string, message: string, link?: string) {
	const url = link ? `${env.APP_URL.replace(/\/$/, "")}${link}` : undefined;
	const html = `
  <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
    <h2 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h2>
    <p style="margin:0 0 20px;line-height:1.6;color:#3f3f46">${escapeHtml(message)}</p>
    ${
		url
			? `<a href="${url}" style="display:inline-block;background:#6d5efc;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">Buka di Content Planner</a>`
			: ""
	}
    <p style="margin-top:28px;font-size:12px;color:#a1a1aa">Anda menerima email ini karena notifikasi email aktif di akun Anda.</p>
  </div>`;

	await getTransporter().sendMail({
		from: env.SMTP_FROM,
		to,
		subject: title,
		text: url ? `${message}\n\n${url}` : message,
		html,
	});
}
