import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import "./config/zod";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./common/middleware/error-handler";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { routes } from "./routes";

export function createApp() {
	const app = express();

	if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);
	app.disable("x-powered-by");

	// API dipanggil dari origin frontend yang berbeda, jadi CORP dibuat cross-origin
	app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
	app.use(
		cors({
			origin: env.CORS_ORIGIN.split(",").map((o) => o.trim()),
			credentials: true,
		}),
	);
	app.use(express.json({ limit: "1mb" }));
	app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));
	app.use(
		rateLimit({
			windowMs: 15 * 60 * 1000,
			limit: 1000,
			standardHeaders: "draft-8",
			legacyHeaders: false,
			message: { message: "Terlalu banyak permintaan, coba lagi nanti" },
		}),
	);

	app.get("/health", async (_req, res) => {
		await prisma.$queryRaw`SELECT 1`;
		res.json({ status: "ok", time: new Date().toISOString() });
	});

	app.use("/api", routes);

	app.use(notFoundHandler);
	app.use(errorHandler);
	return app;
}
