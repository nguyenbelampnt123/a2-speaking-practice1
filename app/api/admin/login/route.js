import { NextResponse } from "next/server";
import { checkAdminPassword, createAdminToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const { password } = await req.json();
    if (!password || !(await checkAdminPassword(password))) {
      return NextResponse.json({ ok: false, error: "Sai mật khẩu quản trị." }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_session", await createAdminToken(), {
      httpOnly: true, secure: process.env.NODE_ENV === "production",
      sameSite: "lax", path: "/", maxAge: 2 * 60 * 60
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: "Lỗi hệ thống." }, { status: 500 });
  }
}