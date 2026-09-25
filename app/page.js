import { cookies } from "next/headers";
import { studentTokenValid } from "@/lib/auth";
import Login from "@/components/Login";
import ReviewApp from "@/components/ReviewApp";

export const dynamic = "force-dynamic";

export default async function Page() {
  const c = await cookies();
  const ok = await studentTokenValid(c.get("student_session")?.value);
  return ok ? <ReviewApp /> : <Login />;
}