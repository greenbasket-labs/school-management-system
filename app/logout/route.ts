import { NextResponse } from "next/server";
import { db } from "../../src/prisma/db";
import { getSession } from "../../src/lib/session";
import { writeAuditLog } from "../../src/lib/audit";

export async function GET() {
  const session = await getSession();

  if (session.userId && session.sessionKey) {
    const sessions = await db.orm.public.UserSession.all();

    const userSession = sessions.find(
      (item) =>
        item.sessionKey === session.sessionKey &&
        item.userId === session.userId,
        );

    if (userSession) {
      await db.orm.public.UserSession
        .where({ id: userSession.id })
        .update({
          status: "REVOKED",
          revokedAt: new Date().toISOString(),
        });

      const schools = await db.orm.public.School.all();
      const school = schools[0];

      if (school) {
        await writeAuditLog({
          schoolId: school.id,
          userId: session.userId,
          action: "LOGOUT",
          entity: "UserSession",
          entityId: userSession.id,
          newValue: {
            status: "REVOKED",
          },
        });
      }
    }
  }

  session.destroy();

  return NextResponse.redirect(
    new URL(
      "/login",
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    ),
  );
}