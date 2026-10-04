import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";
import type { Paginated, PublicUser, Role, User } from "@/types";

export interface UserListParams {
  q?: string;
  role?: Role | "";
  page?: number;
  pageSize?: number;
}

export interface UserPayload {
  name: string;
  email: string;
  phone?: string | null;
  password?: string;
  role: Role;
  isActive?: boolean;
}

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: ["users", "list", params],
    queryFn: async () =>
      (await api.get<Paginated<User>>("/users", { params: { ...params, role: params.role || undefined } })).data,
    placeholderData: keepPreviousData,
  });
}

export function useApprovers() {
  return useQuery({
    queryKey: ["users", "approvers"],
    queryFn: () => unwrap<PublicUser[]>(api.get("/users/approvers")),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSaveUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<UserPayload> & { id?: string }) =>
      id ? unwrap<User>(api.patch(`/users/${id}`, body)) : unwrap<User>(api.post("/users", body)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<{ ok: boolean }>(api.delete(`/users/${id}`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
