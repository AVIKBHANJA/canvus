import "server-only";
import { cookies } from "next/headers";

const COOKIE = "canvus_device_key";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function readDeviceKey(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE)?.value ?? null;
}

export async function setDeviceKey(value: string): Promise<void> {
  const c = await cookies();
  try {
    c.set(COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR,
    });
  } catch {
    /* Server Component invocation — route handler sets on next POST. */
  }
}
