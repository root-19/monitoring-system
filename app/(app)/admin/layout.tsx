import { requireRole } from "@/lib/server/requireRole";
import { AdminShell } from "./AdminShell";

/** Server-side RBAC gate: only admins reach /admin/*. Clients are sent to their portal. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return <AdminShell>{children}</AdminShell>;
}
