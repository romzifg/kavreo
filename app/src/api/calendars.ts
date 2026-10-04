import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { Calendar, CalendarComment, CalendarItem, Paginated, Platform, ReviewStatus } from "@/types";

export interface CalendarListParams {
  status?: ReviewStatus | "";
  q?: string;
  page?: number;
  pageSize?: number;
}

export interface ItemPayload {
  date: string;
  title: string;
  platform: Platform;
  format?: string | null;
  notes?: string | null;
  contentId?: string | null;
}

export interface CalendarPayload {
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  approverIds: string[];
  submit?: boolean;
  items?: ItemPayload[];
}

function useRefresh() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["calendars"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
    void qc.invalidateQueries({ queryKey: ["notifications"] });
  };
}

export function useCalendars(params: CalendarListParams) {
  return useQuery({
    queryKey: ["calendars", "list", params],
    queryFn: async () =>
      (await api.get<Paginated<Calendar>>("/calendars", { params: { ...params, status: params.status || undefined } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useCalendar(id?: string) {
  return useQuery({
    queryKey: ["calendars", "detail", id ?? ""],
    queryFn: () => unwrap<Calendar>(api.get(`/calendars/${id}`)),
    enabled: Boolean(id),
  });
}

export function useCreateCalendar() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: CalendarPayload) => unwrap<Calendar>(api.post("/calendars", body)),
    onSuccess: refresh,
  });
}

export function useUpdateCalendar(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: Partial<CalendarPayload>) => unwrap<Calendar>(api.patch(`/calendars/${id}`, body)),
    onSuccess: refresh,
  });
}

export function useDeleteCalendar() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => unwrap<{ ok: boolean }>(api.delete(`/calendars/${id}`)),
    onSuccess: refresh,
  });
}

export function useAddItem(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: ItemPayload) => unwrap<CalendarItem>(api.post(`/calendars/${calendarId}/items`, body)),
    onSuccess: refresh,
  });
}

export function useUpdateItem(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ itemId, ...body }: Partial<ItemPayload> & { itemId: string }) =>
      unwrap<CalendarItem>(api.patch(`/calendars/${calendarId}/items/${itemId}`, body)),
    onSuccess: refresh,
  });
}

export function useDeleteItem(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (itemId: string) => unwrap<{ ok: boolean }>(api.delete(`/calendars/${calendarId}/items/${itemId}`)),
    onSuccess: refresh,
  });
}

export function useSubmitCalendar(id: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (message?: string) => unwrap<Calendar>(api.post(`/calendars/${id}/submit`, { message })),
    onSuccess: refresh,
  });
}

export function useReviewItem(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ itemId, ...body }: { itemId: string; action: "APPROVE" | "REJECT"; note?: string }) =>
      unwrap<Calendar>(api.post(`/calendars/${calendarId}/items/${itemId}/review`, body)),
    onSuccess: refresh,
  });
}

export function useApproveAll(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (note?: string) => unwrap<Calendar>(api.post(`/calendars/${calendarId}/approve-all`, { note })),
    onSuccess: refresh,
  });
}

export function useAddCalendarComment(calendarId: string) {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (body: { message: string; itemId?: string }) =>
      unwrap<CalendarComment>(api.post(`/calendars/${calendarId}/comments`, body)),
    onSuccess: refresh,
  });
}
