import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminTokenValid, changeStudentPassword } from "@/lib/auth";

export async function POST(req) {
  try {
    const c = await cookies();
    if (!(await adminTokenValid(c.get("admin_session")?.value))) {
      return NextResponse.json({ ok: false, error: "Phiên quản trị đã hết hạn." }, { status: 401 });
    }
    
    const { password } = await req.json();
    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Mật khẩu lớp cần ít nhất 6 ký tự." }, { status: 400 });
    }
    await changeStudentPassword(password);
    return NextResponse.json({ ok: true, message: "Đã đổi mật khẩu lớp và đăng xuất toàn bộ học sinh." });
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
  }
}