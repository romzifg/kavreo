import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
	logger.info(`API berjalan di http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
	logger.info(`${signal} diterima, menutup server...`);
	server.close(async () => {
		await prisma.$disconnect();
		process.exit(0);
	});
	setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (err) => logger.error({ err }, "unhandledRejection"));
