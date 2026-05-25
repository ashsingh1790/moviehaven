import { NextResponse } from "next/server";
import { serverTrpc } from "@/lib/trpc/server";
import { SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user, token } = await serverTrpc.auth.login.mutate({
      email: body.email,
      password: body.password,
    });

    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: false,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * SESSION_EXPIRY_DAYS,
    });
    return res;
  } catch (err: unknown) {
    const msg =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Invalid email or password";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
