import { cookies } from "next/headers";
import { adminTokenValid } from "@/lib/auth";
import { AdminLogin, AdminPanel } from "@/components/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage(){
  const c = await cookies();
  const ok = await adminTokenValid(c.get("admin_session")?.value);
  return ok ? <AdminPanel /> : <AdminLogin />;
}