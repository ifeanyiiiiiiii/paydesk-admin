import "server-only";
import { sealData, unsealData } from "iron-session";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE } from "./constants";

interface SessionData {
  userId?: string;
}

const SESSION_TTL_SECONDS = 8 * 60 * 60; // one working day

function sessionPassword(): string {
  const password = process.env.SESSION_PASSWORD;
  if (!password || password.length < 32) {
    throw new Error(
      "SESSION_PASSWORD must be set to at least 32 characters. See .env.example.",
    );
  }
  return password;
}

/** Reads and decrypts the session cookie. Tampered or expired cookies read as empty. */
export async function getSession(): Promise<SessionData> {
  const sealed = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sealed) return {};
  // Decrypting checks expiry against the current time, so mark this as
  // request-time work rather than something that could be prerendered
  await connection();
  try {
    return await unsealData<SessionData>(sealed, {
      password: sessionPassword(),
      ttl: SESSION_TTL_SECONDS,
    });
  } catch {
    return {};
  }
}

export async function createSession(userId: string): Promise<void> {
  const sealed = await sealData({ userId } satisfies SessionData, {
    password: sessionPassword(),
    ttl: SESSION_TTL_SECONDS,
  });
  (await cookies()).set(SESSION_COOKIE, sealed, {
    httpOnly: true, // not readable from JavaScript, so XSS can't steal it
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function deleteSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}
