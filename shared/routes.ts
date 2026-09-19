import { z } from "zod";
import {
  insertParameterSchema,
  insertSettingSchema,
  parameters, settings,
  logs,
  transfers,
  insertDownloadSchema,
  insertUploadSchema,
  downloadDiagnostics,
  uploadDiagnostics,
  testHistory
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};


// 1. Define your Zod schema
const CPEInformation = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(), // Age is optional
});

export const api = {
  parameters: {
    list: {
      method: "GET" as const,
      path: "/api/parameters",
      responses: {
        200: z.array(z.custom<typeof parameters.$inferSelect>()),
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/parameters/:name",
      input: z.object({ value: z.string(), notification: z.number().optional() }),
      responses: {
        200: z.custom<typeof parameters.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    reset: {
      method: "POST" as const,
      path: "/api/parameters/reset",
      responses: {
        200: z.object({ message: z.string() })
      }
    },
    notifications: {
      method: "GET" as const,
      path: "/api/parameters/notifications",
      responses: {
        200: z.array(z.custom<typeof parameters.$inferSelect>()),
      },
    },
  },
  settings: {
    list: {
      method: "GET" as const,
      path: "/api/settings",
      responses: {
        200: z.array(z.custom<typeof settings.$inferSelect>()),
      },
    },
    update: {
      method: "POST" as const,
      path: "/api/settings",
      input: z.array(insertSettingSchema),
      responses: {
        200: z.array(z.custom<typeof settings.$inferSelect>()),
      },
    },
  },
  logs: {
    list: {
      method: "GET" as const,
      path: "/api/logs",
      input: z.object({ limit: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.array(z.custom<typeof logs.$inferSelect>()),
      },
    },
    clear: {
      method: "DELETE" as const,
      path: "/api/logs",
      responses: {
        204: z.void()
      }
    }
  },
  simulation: {
    inform: {
      method: "POST" as const,
      path: "/api/simulation/inform",
      input: z.object({ eventCode: z.string().default("2 PERIODIC") }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
      },
    },
    transferComplete: {
      method: "POST" as const,
      path: "/api/simulation/transferComplete",
      input: z.object({ transferId: z.number() }),
      responses: {
        200: z.object({ success: z.boolean(), message: z.string() }),
      },
    },
  },
  transfers: {
    list: {
      method: "GET" as const,
      path: "/api/transfers",
      responses: {
        200: z.array(z.custom<typeof transfers.$inferSelect>()),
      },
    },
  },
  cpe: {
    info: {
      method: "GET" as const,
      path: "/api/info",
      input: z.object({ limit: z.coerce.number().optional() }).optional(),
      responses: {
        200: z.object({
          manufacturer: z.string().default("Huawei Technologies"),
          model: z.string().default("HG8245H"),
          serialNumber: z.string().default("48575443A1B2C3D4"),
          softwareVersion: z.string().default("V5R019C00S125"),
          hardwareVersion: z.string().default("168D.A"),
          connectionStatus: z.string().default("online"),
          lastContact: z.string().default("2026-01-17T14:32:45Z"),
          ipAddress: z.string().default("192.168.1.1"),
          macAddress: z.string().default("00:1A:2B:3C:4D:5E"),
          uptime: z.string().default("15d 7h 23m 45s")
        }),
      },
    },
  },
  download: {
    get: {
      method: 'GET' as const,
      path: '/api/diagnostics/download',
      responses: {
        200: z.custom<typeof downloadDiagnostics.$inferSelect>(),
      },
    },
    update: { // Used to set "Requested" state and start test
      method: 'POST' as const,
      path: '/api/diagnostics/download',
      input: insertDownloadSchema,
      responses: {
        200: z.custom<typeof downloadDiagnostics.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  upload: {
    get: {
      method: 'GET' as const,
      path: '/api/diagnostics/upload',
      responses: {
        200: z.custom<typeof uploadDiagnostics.$inferSelect>(),
      },
    },
    update: { // Used to set "Requested" state and start test
      method: 'POST' as const,
      path: '/api/diagnostics/upload',
      input: insertUploadSchema,
      responses: {
        200: z.custom<typeof uploadDiagnostics.$inferSelect>(),
        400: errorSchemas.validation,
      },
    }
  },
  history: {
    list: {
      method: 'GET' as const,
      path: '/api/history',
      responses: {
        200: z.array(z.custom<typeof testHistory.$inferSelect>()),
      },
    }
  }
};//api ends

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
