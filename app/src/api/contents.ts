import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { Content, ContentComment, ContentType, Paginated, Platform, ReviewStatus } from "@/types";

export interface ContentListParams {
  type?: ContentType;
  status?: ReviewStatus | "";
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ContentPayload {
  type?: ContentType;
  title: string;
  platform: Platform;
  category?: string | null;
  hook?: string | null;
  body?: string | null;
  cta?: string | null;
  tone?: string | null;
  durationSec?: number | null;
  description?: string | null;
  hashtags: string[];
  approverIds: string[];
  submit?: boolean;
}

const keys = {
  list: (p: ContentListParams) => ["contents", "list", p] as const,
  detail: (id: string) => ["contents", "detail", id] as const,
};

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["contents"] });
    void qc.invalidateQueries({ queryKey: ["tasks"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useContents(params: ContentListParams) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: async () => (await api.get<Paginated<Content>>("/contents", { params: { ...params, status: params.status || undefined } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useContent(id?: string) {
  return useQuery({
    queryKey: keys.detail(id ?? ""),
    queryFn: () => unwrap<Content>(api.get(`/contents/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateContent() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: ContentPayload) => unwrap<Content>(api.post("/contents", body)),
    onSuccess: refresh,
  });
}

export function useUpdateContent(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: Partial<ContentPayload>) => unwrap<Content>(api.patch(`/contents/${id}`, body)),
    onSuccess: refresh,
  });
}

export function useDeleteContent() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => unwrap<{ ok: boolean }>(api.delete(`/contents/${id}`)),
    onSuccess: refresh,
  });
}

export function useSubmitContent(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (message?: string) => unwrap<Content>(api.post(`/contents/${id}/submit`, { message })),
    onSuccess: refresh,
  });
}

export function useReviewContent(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { action: "APPROVE" | "REJECT"; message?: string }) =>
      unwrap<Content>(api.post(`/contents/${id}/review`, body)),
    onSuccess: refresh,
  });
}

export function useAddContentComment(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (message: string) => unwrap<ContentComment>(api.post(`/contents/${id}/comments`, { message })),
    onSuccess: refresh,
  });
}
