import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = {
  userId?: number;
  sessionKey?: string;
};

const SESSION_COOKIE = "school_session";

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "development-only-change-this-secret-1234567890",
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export async function getSession() {
  const cookieStore = await cookies();

  return getIronSession<SessionData>(
    cookieStore,
    sessionOptions,
  );
}