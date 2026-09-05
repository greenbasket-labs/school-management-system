import { db } from "../prisma/db";

export async function getAcademicSessions(schoolId: number) {
  const sessions = await db.orm.public.AcademicSession.all();

  return sessions
    .filter((session) => session.schoolId === schoolId)
    .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
}

export async function getAcademicSessionById(
  sessionId: number,
  schoolId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();

  return sessions.find(
    (session) => session.id === sessionId && session.schoolId === schoolId,
  );
}

export async function getTermsForSession(
  sessionId: number,
  schoolId: number,
) {
  const session = await getAcademicSessionById(sessionId, schoolId);

  if (!session) {
    return [];
  }

  const terms = await db.orm.public.Term.all();

  return terms
    .filter((term) => term.sessionId === sessionId)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

export async function getActiveAcademicSession(schoolId: number) {
  const sessions = await db.orm.public.AcademicSession.all();

  return sessions.find(
    (session) =>
      session.schoolId === schoolId &&
      session.status === "ACTIVE",
  );
}

export async function getActiveTerm(sessionId: number) {
  const terms = await db.orm.public.Term.all();

  return terms.find(
    (term) =>
      term.sessionId === sessionId &&
      term.isActive === true,
  );
}