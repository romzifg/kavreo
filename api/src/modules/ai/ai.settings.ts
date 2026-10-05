import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { badRequest } from "../../common/errors";
import type { AiSettingsInput } from "./ai.schema";

const secret = createHash("sha256").update(env.AI_ENCRYPTION_KEY ?? env.JWT_SECRET).digest();
export function encryptKey(value: string) {
  const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", secret, iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv.toString("base64"), data.toString("base64"), cipher.getAuthTag().toString("base64")].join(".");
}
export function decryptKey(value: string | null) {
  if (!value) return "";
  const [iv, data, tag] = value.split(".");
  const cipher = createDecipheriv("aes-256-gcm", secret, Buffer.from(iv, "base64"));
  cipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([cipher.update(Buffer.from(data, "base64")), cipher.final()]).toString("utf8");
}
export async function aiConfig() {
  return prisma.applicationSettings.upsert({ where: { id: "global" }, create: { id: "global" }, update: {} });
}
export async function adminSettings() {
  const c = await aiConfig();
  return { enabled: c.aiEnabled, protocol: c.aiProtocol, providerName: c.aiProviderName, baseUrl: c.aiBaseUrl,
    model: c.aiModel, hasApiKey: Boolean(c.aiApiKey), maxTokens: c.aiMaxTokens, dailyLimit: c.aiDailyLimit,
    timeoutSec: c.aiTimeoutSec, inputPrice: c.aiInputPrice, outputPrice: c.aiOutputPrice };
}
export async function saveSettings(input: AiSettingsInput) {
  const previous = await aiConfig();
  const changedProvider = previous.aiBaseUrl !== input.baseUrl.replace(/\/$/, "") || previous.aiProtocol !== input.protocol;
  // Never send an old provider's key to a newly configured host.
  const key = input.clearApiKey || changedProvider ? null : previous.aiApiKey;
  const nextKey = input.apiKey ? encryptKey(input.apiKey) : key;
  if (input.enabled && input.protocol !== "OLLAMA" && !nextKey) throw badRequest("Isi API key untuk penyedia ini");
  await prisma.applicationSettings.update({ where: { id: "global" }, data: {
    aiEnabled: input.enabled, aiProtocol: input.protocol, aiProviderName: input.providerName,
    aiBaseUrl: input.baseUrl.replace(/\/$/, ""), aiModel: input.model, aiApiKey: nextKey,
    aiMaxTokens: input.maxTokens, aiDailyLimit: input.dailyLimit, aiTimeoutSec: input.timeoutSec,
    aiInputPrice: input.protocol === "OLLAMA" ? 0 : input.inputPrice,
    aiOutputPrice: input.protocol === "OLLAMA" ? 0 : input.outputPrice,
  } });
  return adminSettings();
}
