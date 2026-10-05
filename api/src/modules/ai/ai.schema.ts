import { z } from "zod";

export const aiSettingsSchema = z.object({
  enabled: z.boolean(),
  protocol: z.enum(["OLLAMA", "OPENAI_COMPATIBLE", "ANTHROPIC"]),
  providerName: z.string().trim().min(1).max(80),
  baseUrl: z.url().max(500).refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash;
  }, "Gunakan URL HTTP/HTTPS tanpa kredensial, query, atau fragment"),
  model: z.string().trim().min(1).max(120),
  apiKey: z.string().trim().max(1000).optional(),
  clearApiKey: z.boolean().optional(),
  maxTokens: z.number().int().min(64).max(2000),
  dailyLimit: z.number().int().min(1).max(1000),
  timeoutSec: z.number().int().min(10).max(300),
  inputPrice: z.number().min(0).max(1000),
  outputPrice: z.number().min(0).max(1000),
}).strict().refine((value) => value.protocol === "OLLAMA" || new URL(value.baseUrl).protocol === "https:", {
  path: ["baseUrl"], message: "API produksi harus menggunakan HTTPS",
});

export const suggestionSchema = z.object({
  feature: z.enum(["SCRIPT", "IDEA"]),
  title: z.string().trim().min(3, "Isi judul minimal 3 karakter dahulu").max(160),
  platform: z.string().max(40),
  category: z.string().max(60).default(""),
  tone: z.string().max(60).default(""),
  durationSec: z.string().max(3).default(""),
  currentText: z.string().max(10000).default(""),
  instruction: z.string().trim().max(1000).default(""),
}).strict();
export type SuggestionInput = z.infer<typeof suggestionSchema>;
export type AiSettingsInput = z.infer<typeof aiSettingsSchema>;

export const usageQuerySchema = z.object({
  from: z.iso.date().optional(), to: z.iso.date().optional(),
  userId: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
}).refine((v) => !v.from || !v.to || v.to >= v.from, "Tanggal akhir harus setelah tanggal awal");
