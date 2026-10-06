import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { ContentType, Platform, PublicUser, ReviewStatus, Paginated } from "@/types";
import { useAuthStore } from "@/stores/auth.store";
export interface WorkTask {
  id: string;
  title: string;
  brief: string;
  deadline: string;
  startedAt: string | null;
  status: "TODO" | "IN_PROGRESS" | ReviewStatus;
  overdue: boolean;
  assignee: PublicUser;
  assigner: PublicUser;
  content: {
    id: string;
    type: ContentType;
    status: ReviewStatus;
    platform: Platform;
  };
}
export interface TaskInput {
  title: string;
  brief: string;
  deadline: string;
  assigneeId: string;
  type: ContentType;
  platform: Platform;
}
export function useTasks(status = "ACTIVE", page = 1, pageSize = 12) {
  const id = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: ["tasks", id, status, page, pageSize],
    queryFn: async () => (await api.get<Paginated<WorkTask>>("/tasks", {
      params: {
        status,
        page,
        pageSize
      }
    })).data,
    refetchInterval: 30000,
    enabled: Boolean(id)
  });
}
export function useAssignees(enabled: boolean) {
  const id = useAuthStore(s => s.user?.id);
  return useQuery({
    queryKey: ["task-assignees", id],
    queryFn: () => unwrap<PublicUser[]>(api.get("/tasks/assignees")),
    enabled
  });
}
export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...input
    }: TaskInput & {
      id?: string;
    }) => unwrap<WorkTask>(id ? api.patch(`/tasks/${id}`, {
      title: input.title,
      brief: input.brief,
      deadline: input.deadline
    }) : api.post("/tasks", input)),
    onSuccess: () => {
      for (const key of ["tasks", "contents", "dashboard", "notifications"]) void qc.invalidateQueries({
        queryKey: [key]
      });
    }
  });
}
