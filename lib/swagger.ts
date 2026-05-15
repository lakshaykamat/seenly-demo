import { createSwaggerSpec } from "next-swagger-doc";

export function getApiDocs() {
  return createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Seenly API",
        version: "1.0.0",
        description:
          "Seenly API documentation. All endpoints except /api/health require authentication via Supabase session cookie.",
      },
      servers: [{ url: "/", description: "Current origin" }],
    },
  });
}
