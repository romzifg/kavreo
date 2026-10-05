import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../common/middleware/auth";
import { getApplicationSettings, updateApplicationSettings } from "./settings.service";

export const settingsRoutes = Router();
const settingsSchema = z.object({ approvalEnabled: z.boolean() }).strict();

settingsRoutes.get("/", async (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.json({ data: await getApplicationSettings() });
});

settingsRoutes.patch("/", requireRole("SUPERADMIN"), async (req, res) => {
  const input = settingsSchema.parse(req.body);
  res.json({ data: await updateApplicationSettings(input.approvalEnabled) });
});
