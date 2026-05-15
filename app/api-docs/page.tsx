"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

const SwaggerUI = dynamic(
  () => import("swagger-ui-react").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <div className="p-8">Loading API docs...</div>,
  }
);

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-white">
      <SwaggerUI url="/api/openapi" />
    </main>
  );
}
