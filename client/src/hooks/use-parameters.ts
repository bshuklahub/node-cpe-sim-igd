import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useParameters() {
  return useQuery({
    queryKey: [api.parameters.list.path],
    queryFn: async () => {
      const res = await fetch(api.parameters.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parameters");
      return api.parameters.list.responses[200].parse(await res.json());
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: [api.parameters.notifications.path],
    queryFn: async () => {
      const res = await fetch(api.parameters.notifications.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch parameters");
      return api.parameters.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateParameter() {

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, value }: { name: string; value: string }) => {
      console.log(".....useUpdateParameter url="+api.parameters.update.path,name);
      const url = buildUrl(api.parameters.update.path, { name });
      const validated = api.parameters.update.input.parse({ value });
      console.log(".....useUpdateParameter url="+url);
      console.log(".....api.parameters.update.method="+api.parameters.update.method);
      console.log(".....body="+validated);
      const res = await fetch(url, {
        method: api.parameters.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        signal: AbortSignal.timeout(5000), // 5 second timeout
        credentials: "include",
      });
      console.log(".....res.ok+"+res.ok);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Parameter not found");
        throw new Error("Failed to update parameter");
      }
      return api.parameters.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.parameters.list.path] }),
  });
}

export function useResetParameters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(api.parameters.reset.path, {
        method: api.parameters.reset.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reset parameters");
      return api.parameters.reset.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.parameters.list.path] }),
  });
}

export function useBulkInsertParameters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: z.infer<typeof api.parameters.bulkInsert.input>) => {
      const res = await fetch(api.parameters.bulkInsert.path, {
        method: api.parameters.bulkInsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to insert parameters");
      return api.parameters.bulkInsert.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.parameters.list.path] }),
  });
}
