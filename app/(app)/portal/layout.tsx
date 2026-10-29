import { requireRole } from "@/lib/server/requireRole";
import { PortalShell } from "./PortalShell";

/** Server-side RBAC gate: only clients reach /portal/*. Admins are sent to the admin dashboard. */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  await requireRole("client");
  return <PortalShell>{children}</PortalShell>;
}
