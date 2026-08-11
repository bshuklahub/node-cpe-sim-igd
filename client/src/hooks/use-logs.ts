import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useLogs(limit: number = 100) {
  return useQuery({
    queryKey: [api.logs.list.path, limit],
    queryFn: async () => {
      const url = `${api.logs.list.path}?limit=${limit}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s
  });
}

export function useClearLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.logs.clear.path, {
        method: api.logs.clear.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clear logs");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.logs.list.path] }),
  });
}
