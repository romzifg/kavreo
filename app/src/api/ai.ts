import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

export interface AiSettings {
  enabled: boolean; protocol: "OLLAMA" | "OPENAI_COMPATIBLE" | "ANTHROPIC"; providerName: string;
  baseUrl: string; model: string; hasApiKey: boolean; maxTokens: number; dailyLimit: number;
  timeoutSec: number; inputPrice: number; outputPrice: number;
}
export interface SuggestionInput {
  feature: "SCRIPT" | "IDEA"; title: string; platform: string; category: string; tone: string;
  durationSec: string; currentText: string; instruction: string;
}
export interface AiResult { text: string; provider: string; model: string; truncated: boolean; usageId: string }
export function useAiAvailability() {
  return useQuery({ queryKey: ["ai", "availability"], queryFn: () => unwrap<{ enabled: boolean; providerName: string; model: string; dailyLimit: number; usedToday: number }>(api.get("/ai/availability")), staleTime: 0 });
}
export function useAiSuggest() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (input: SuggestionInput) => unwrap<AiResult>(api.post("/ai/suggest", input, { timeout: 310000 })), onSettled: () => { void qc.invalidateQueries({ queryKey: ["ai"] }); } });
}
export function useAiSettings() {
  return useQuery({ queryKey: ["ai", "settings"], queryFn: () => unwrap<AiSettings>(api.get("/ai/settings")) });
}
export function useSaveAiSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (body: Omit<AiSettings, "hasApiKey"> & { apiKey?: string; clearApiKey?: boolean }) => unwrap<AiSettings>(api.patch("/ai/settings", body)), onSuccess: () => { void qc.invalidateQueries({ queryKey: ["ai"] }); } });
}
export function useTestAi() {
  return useMutation({ mutationFn: () => unwrap<{ message: string; text: string }>(api.post("/ai/test", {}, { timeout: 310000 })) });
}
interface UsageUser { id: string; name: string; email: string }
interface UsageRow extends UsageUser { requests: number; success: number; failed: number; pending: number; inputTokens: number; outputTokens: number; costUsd: number }
interface UsageLog { id: string; user: UsageUser; feature: string; provider: string; model: string; status: string; inputTokens: number | null; outputTokens: number | null; durationMs: number | null; costUsd: number | null; errorCode: string | null; createdAt: string }
export interface UsageDashboard { total: number; counts: Record<string, number>; tokens: { inputTokens: number | null; outputTokens: number | null; costUsd: number | null }; unknownUsage: number; users: UsageUser[]; rows: UsageRow[]; logs: UsageLog[]; page: number; pages: number }
export function useAiUsage(params: { from: string; to: string; userId: string; page: number }) {
  return useQuery({ queryKey: ["ai", "usage", params], queryFn: () => unwrap<UsageDashboard>(api.get("/ai/usage", { params })), refetchInterval: 15000 });
}
