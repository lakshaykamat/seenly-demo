import { COMPANY } from "./company";

export function buildUrl(domain: string, path: string): string {
  const cleanDomain = domain.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (!path || path === "/") return `https://${cleanDomain}/`;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `https://${cleanDomain}${p}`;
}

export function brandUrl(path: string, hostKey?: string): string {
  if (hostKey === "secondary") return buildUrl(COMPANY.secondaryHost, path);
  return buildUrl(COMPANY.brand.domain, path);
}

export function humanizePath(path: string, domain: string): string {
  if (path === "/") return `${domain} — ${COMPANY.brand.tagline}`;
  const last = path.split("/").filter(Boolean).pop() ?? "";
  return last
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
