import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_EXPIRY_DAYS } from "./auth-constants";

export { SESSION_COOKIE, SESSION_EXPIRY_DAYS };

export interface SessionUser {
  userId: string;
  email: string;
}

function secret() {
  const key = process.env.JWT_SECRET;
  if (!key) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(key);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
