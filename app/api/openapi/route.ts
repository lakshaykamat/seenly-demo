import { NextResponse } from "next/server";
import { getApiDocs } from "@/lib/swagger";
import { readFile } from "fs/promises";
import { join } from "path";

export async function GET() {
  // Prefer pre-generated spec (build-time) - required for Vercel serverless
  const staticPath = join(process.cwd(), "public", "openapi.json");
  try {
    const content = await readFile(staticPath, "utf-8");
    const spec = JSON.parse(content);
    return NextResponse.json(spec);
  } catch {
    // Fallback: generate at runtime (works locally in dev)
    const spec = getApiDocs();
    return NextResponse.json(spec);
  }
}
