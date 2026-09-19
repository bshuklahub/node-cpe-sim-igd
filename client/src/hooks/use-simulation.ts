import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useInform() {
  return useMutation({
    mutationFn: async (eventCode: string) => {
      
      const validated = api.simulation.inform.input.parse({ eventCode });
      
      const res = await fetch(api.simulation.inform.path, {
        method: api.simulation.inform.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to trigger Inform");
      return api.simulation.inform.responses[200].parse(await res.json());
    },
  });
}
