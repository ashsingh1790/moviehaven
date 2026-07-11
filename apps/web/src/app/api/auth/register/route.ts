import { SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "@/lib/auth";
import { serverTrpc } from "@/lib/trpc/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user, token } = await serverTrpc.auth.register.mutate({
      email: body.email,
      password: body.password,
      username: body.username || undefined,
    });

    const res = NextResponse.json({ user });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: false, // client JS reads it for tRPC Authorization header
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
        : "Registration failed";
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    const status = code === "CONFLICT" ? 409 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
