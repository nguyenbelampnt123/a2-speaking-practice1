import { NextResponse } from "next/server";
import {
  checkStudentPassword,
  createStudentToken
} from "@/lib/auth";

export async function POST(req) {
  try {
    const { password } = await req.json();

    if (!password || !(await checkStudentPassword(password))) {
      return NextResponse.json(
        {
          ok: false,
          error: "Sai mật khẩu."
        },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      ok: true
    });

    res.cookies.set(
      "student_session",
      await createStudentToken(),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 8 * 60 * 60
      }
    );

    return res;

  } catch (err) {

    console.error("LOGIN ERROR:", err);

    return NextResponse.json(
      {
        ok: false,
        error:
          "LOGIN ERROR: " +
          (err?.message || String(err))
      },
      { status: 500 }
    );
  }
}
