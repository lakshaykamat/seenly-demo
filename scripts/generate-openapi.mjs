/**
 * Generates OpenAPI spec at build time.
 * Required for Vercel: serverless functions don't have access to full app/api source.
 */
import { createSwaggerSpec } from "next-swagger-doc";
import fs from "fs";
import path from "path";

const spec = createSwaggerSpec({
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

const outPath = path.join(process.cwd(), "public", "openapi.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(spec, null, 2), "utf-8");
console.log("Generated openapi.json at", outPath);
