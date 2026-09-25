import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { studentTokenValid } from "@/lib/auth";
export async function GET() {
  const c = await cookies();
  const ok = await studentTokenValid(c.get("student_session")?.value);
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}