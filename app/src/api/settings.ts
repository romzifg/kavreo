import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api";

export interface ApplicationSettings { approvalEnabled: boolean }
const key = ["application-settings"];

export function useApplicationSettings() {
  return useQuery({
    queryKey: key,
    queryFn: () => unwrap<ApplicationSettings>(api.get("/settings")),
    staleTime: 0,
    refetchInterval: 30000,
  });
}

export function useUpdateApplicationSettings() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (approvalEnabled: boolean) => unwrap<ApplicationSettings>(api.patch("/settings", { approvalEnabled })),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: key });
    },
  });
}
