import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Rankly API",
        version: "1.0.0",
        description:
          "Rankly API documentation. All endpoints except /api/health require authentication via Supabase session cookie.",
      },
      servers: [{ url: "/", description: "Current origin" }],
    },
  });
}
