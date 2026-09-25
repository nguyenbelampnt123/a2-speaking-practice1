import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminTokenValid, changeAdminPassword } from "@/lib/auth";

export async function POST(req) {
  try {
    const c = await cookies();
    if (!(await adminTokenValid(c.get("admin_session")?.value))) {
      return NextResponse.json({ ok: false, error: "Phiên quản trị đã hết hạn." }, { status: 401 });
    }
    
    const { password } = await req.json();
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Mật khẩu quản trị cần ít nhất 8 ký tự." }, { status: 400 });
    }
    await changeAdminPassword(password);
    const res = NextResponse.json({ ok: true, message: "Đã đổi mật khẩu quản trị. Hãy đăng nhập lại." });
    res.cookies.set("admin_session", "", { httpOnly: true, path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
  }
}