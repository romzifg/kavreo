import { AppError } from "../../common/errors";
import { decryptKey } from "./ai.settings";
import type { ApplicationSettings } from "../../generated/prisma/client";
import { z } from "zod";

export class ProviderError extends AppError {
  constructor(public code: string, message: string) { super(502, message); }
}
const token = z.number().int().min(0).max(10000000).nullish();
const ollamaResponse = z.object({ message: z.object({ content: z.string() }), prompt_eval_count: token, eval_count: token, done_reason: z.string().optional() });
const compatibleResponse = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }), finish_reason: z.string().nullish() })).min(1), usage: z.object({ prompt_tokens: token, completion_tokens: token }).optional() });
const claudeResponse = z.object({ content: z.array(z.object({ type: z.string(), text: z.string().optional() })), usage: z.object({ input_tokens: token, output_tokens: token }).optional(), stop_reason: z.string().nullish() });

export async function callProvider(c: ApplicationSettings, system: string, prompt: string) {
  let key: string;
  try { key = decryptKey(c.aiApiKey); }
  catch { throw new ProviderError("KEY_ERROR", "API key tidak dapat dibaca. Superadmin perlu menyimpan ulang API key."); }
  const messages = [{ role: "system", content: system }, { role: "user", content: prompt }];
  let path: string, body: object;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (c.aiProtocol === "OLLAMA") {
    path = "/api/chat";
    body = { model: c.aiModel, messages, stream: false, options: { num_predict: c.aiMaxTokens } };
    if (key) headers.Authorization = `Bearer ${key}`;
  } else if (c.aiProtocol === "ANTHROPIC") {
    path = "/messages";
    headers["x-api-key"] = key;
    headers["anthropic-version"] = "2023-06-01";
    body = { model: c.aiModel, system, messages: [{ role: "user", content: prompt }], max_tokens: c.aiMaxTokens };
  } else {
    path = "/chat/completions";
    headers.Authorization = `Bearer ${key}`;
    // max_completion_tokens is required by OpenAI reasoning models; other gateways use max_tokens.
    const reasoning = /^(?:o[1-9]|gpt-[5-9])/.test(c.aiModel);
    body = { model: c.aiModel, messages, stream: false, [reasoning ? "max_completion_tokens" : "max_tokens"]: c.aiMaxTokens };
  }
  let response: Response;
  try {
    response = await fetch(c.aiBaseUrl.replace(/\/$/, "") + path, {
      method: "POST", headers, body: JSON.stringify(body), redirect: "error", signal: AbortSignal.timeout(c.aiTimeoutSec * 1000),
    });
  } catch (error) {
    const timeout = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
    throw new ProviderError(timeout ? "TIMEOUT" : "CONNECTION", timeout ? "AI melewati batas waktu. Coba gunakan model lebih ringan atau tambah batas waktu di pengaturan." : c.aiProtocol === "OLLAMA" ? "Tidak dapat terhubung ke Ollama. Jalankan ollama serve pada komputer tempat backend berjalan, atau periksa Base URL di Pengaturan AI." : "Tidak dapat terhubung ke penyedia AI. Periksa Base URL dan koneksi jaringan backend.");
  }
  if (!response.ok) {
    throw new ProviderError(`HTTP_${response.status}`, response.status === 404 ? "Model atau endpoint AI tidak ditemukan. Periksa nama model dan Base URL." : response.status === 401 || response.status === 403 ? "API key ditolak penyedia AI. Hubungi Superadmin." : response.status === 429 ? "Kuota penyedia AI habis atau terlalu banyak permintaan. Coba lagi nanti." : "Penyedia AI gagal memproses permintaan. Coba lagi nanti.");
  }
  // The timeout also covers reading the body. Never return upstream error bodies or keys.
  try {
    const data: unknown = await response.json();
    if (c.aiProtocol === "OLLAMA") {
      const r = ollamaResponse.parse(data);
      return { text: r.message.content, inputTokens: r.prompt_eval_count ?? null, outputTokens: r.eval_count ?? null, truncated: r.done_reason === "length" };
    }
    if (c.aiProtocol === "ANTHROPIC") {
      const r = claudeResponse.parse(data);
      return { text: r.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n"), inputTokens: r.usage?.input_tokens ?? null, outputTokens: r.usage?.output_tokens ?? null, truncated: r.stop_reason === "max_tokens" };
    }
    const r = compatibleResponse.parse(data);
    return { text: r.choices[0].message.content ?? "", inputTokens: r.usage?.prompt_tokens ?? null, outputTokens: r.usage?.completion_tokens ?? null, truncated: r.choices[0].finish_reason === "length" };
  } catch {
    throw new ProviderError("INVALID_RESPONSE", "Respons AI tidak sesuai format atau tidak lengkap. Periksa protokol endpoint.");
  }
}
