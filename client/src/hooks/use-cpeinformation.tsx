import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useCPEInformation(limit: number = 100) {
   return useQuery({
    queryKey: [api.cpe.info.path, limit],
    queryFn: async () => {
      const url = `${api.cpe.info.path}?limit=${limit}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch device information");
      return api.cpe.info.responses[200].parse(await res.json());
    },
    refetchInterval: 5000, // Poll every 5s
  });
}


