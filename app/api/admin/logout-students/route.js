import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminTokenValid, logoutAllStudents } from "@/lib/auth";

export async function POST(req) {
  try {
    const c = await cookies();
    if (!(await adminTokenValid(c.get("admin_session")?.value))) {
      return NextResponse.json({ ok: false, error: "Phiên quản trị đã hết hạn." }, { status: 401 });
    }
    
    await logoutAllStudents();
    return NextResponse.json({ ok: true, message: "Đã đăng xuất toàn bộ học sinh." });
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
  }
}