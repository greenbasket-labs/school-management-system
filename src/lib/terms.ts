import { db } from "../prisma/db";

export async function getTermsForSession(
  sessionId: number,
  schoolId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();

  const session = sessions.find(
    (item) => item.id === sessionId && item.schoolId === schoolId,
  );

  if (!session) {
    return [];
  }

  const terms = await db.orm.public.Term.all();

  return terms
    .filter((term) => term.sessionId === sessionId)
    .sort((a, b) =>
      String(a.startDate).localeCompare(String(b.startDate)),
    );
}

export async function getTermById(
  termId: number,
  sessionId: number,
  schoolId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();

  const session = sessions.find(
    (item) => item.id === sessionId && item.schoolId === schoolId,
  );

  if (!session) {
    return undefined;
  }

  const terms = await db.orm.public.Term.all();

  return terms.find(
    (term) => term.id === termId && term.sessionId === sessionId,
  );
}

export async function getActiveTermForSession(
  sessionId: number,
  schoolId: number,
) {
  const sessions = await db.orm.public.AcademicSession.all();

  const session = sessions.find(
    (item) => item.id === sessionId && item.schoolId === schoolId,
  );

  if (!session) {
    return undefined;
  }

  const terms = await db.orm.public.Term.all();

  return terms.find(
    (term) =>
      term.sessionId === sessionId &&
      term.isActive === true,
  );
}