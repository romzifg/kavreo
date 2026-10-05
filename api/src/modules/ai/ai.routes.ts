import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireRole } from "../../common/middleware/auth";
import { currentUser } from "../../common/utils";
import { aiSettingsSchema, suggestionSchema, usageQuerySchema } from "./ai.schema";
import { adminSettings, saveSettings } from "./ai.settings";
import { aiAvailability, suggest, usageDashboard } from "./ai.service";

export const aiRoutes = Router();
aiRoutes.use((_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
aiRoutes.get("/availability", requireRole("USER"), async (req, res) => res.json({ data: await aiAvailability(currentUser(req).id) }));
aiRoutes.post("/suggest", requireRole("USER"), rateLimit({ windowMs: 60000, limit: 10, message: { message: "Terlalu banyak permintaan AI. Coba lagi dalam satu menit." }, standardHeaders: "draft-8", legacyHeaders: false }), async (req, res) => {
  res.json({ data: await suggest(currentUser(req), suggestionSchema.parse(req.body)) });
});
aiRoutes.use(requireRole("SUPERADMIN"));
aiRoutes.get("/settings", async (_req, res) => res.json({ data: await adminSettings() }));
aiRoutes.patch("/settings", async (req, res) => res.json({ data: await saveSettings(aiSettingsSchema.parse(req.body)) }));
aiRoutes.post("/test", rateLimit({ windowMs: 60000, limit: 3, message: { message: "Tunggu sebentar sebelum menguji kembali" } }), async (req, res) => {
  const result = await suggest(currentUser(req), { feature: "IDEA", title: "Kavreo siap berkarya", platform: "OTHER", category: "", tone: "", durationSec: "", currentText: "", instruction: "Cukup tulis satu kalimat singkat." }, true);
  res.json({ data: { ...result, message: "Koneksi dan model AI berhasil diuji" } });
});
aiRoutes.get("/usage", async (req, res) => res.json({ data: await usageDashboard(usageQuerySchema.parse(req.query)) }));
