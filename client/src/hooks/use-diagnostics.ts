import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type {
  DownloadDiagnostics,
  InsertDownloadDiagnostics,
  UploadDiagnostics,
  InsertUploadDiagnostics,
  TestHistory
} from "@shared/schema";

// --- DOWNLOAD HOOKS ---

export function useDownloadDiagnostics(refetchInterval = false) {
  console.log("useDownloadDiagnostics called with refetchInterval:", refetchInterval);
  return useQuery({
    queryKey: [api.download.get.path],
    queryFn: async () => {
      const res = await fetch(api.download.get.path);
      if (!res.ok) throw new Error("Failed to fetch download diagnostics");
      return api.download.get.responses[200].parse(await res.json());
    },
    refetchInterval: refetchInterval ? 1000 : false, // Poll every second if requested
  });
}

export function useStartDownloadTest() {
  console.log("useStartDownloadTest called");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDownloadDiagnostics) => {
      // Ensure we set state to Requested to trigger the test
      const payload = { ...data, diagnosticsState: "Requested" };
      const res = await fetch(api.download.update.path, {
        method: api.download.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start download test");
      }
      return api.download.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.download.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });
}

// --- UPLOAD HOOKS ---

export function useUploadDiagnostics(refetchInterval = false) {
  console.log("useUploadDiagnostics called with refetchInterval:", refetchInterval);
  return useQuery({
    queryKey: [api.upload.get.path],
    queryFn: async () => {
      const res = await fetch(api.upload.get.path);
      if (!res.ok) throw new Error("Failed to fetch upload diagnostics");
      return api.upload.get.responses[200].parse(await res.json());
    },
    refetchInterval: refetchInterval ? 1000 : false,
  });
}

export function useStartUploadTest() {
  console.log("useStartUploadTest called");
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertUploadDiagnostics) => {
      const payload = { ...data, diagnosticsState: "Requested" };
      const res = await fetch(api.upload.update.path, {
        method: api.upload.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to start upload test");
      }
      return api.upload.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.upload.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.history.list.path] });
    },
  });
}

// --- HISTORY HOOKS ---

export function useTestHistory() {
  return useQuery({
    queryKey: [api.history.list.path],
    queryFn: async () => {
      const res = await fetch(api.history.list.path);
      if (!res.ok) throw new Error("Failed to fetch history");
      return api.history.list.responses[200].parse(await res.json());
    },
  });
}
