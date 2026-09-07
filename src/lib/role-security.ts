import { db } from "../prisma/db";

export async function assertRoleChangeAllowed(
  userId: number,
  schoolId: number,
) {
  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === schoolId,
  );

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.roleRestrictedUntil) {
    return true;
  }

  const restrictedUntil = new Date(
    user.roleRestrictedUntil,
  ).getTime();

  if (Number.isNaN(restrictedUntil)) {
    return true;
  }

  const now = Date.now();

  if (now >= restrictedUntil) {
    return true;
  }

  const remainingMs =
    restrictedUntil - now;

  const remainingDays = Math.ceil(
    remainingMs / (24 * 60 * 60 * 1000),
  );

  throw new Error(
    `Role changes are temporarily restricted for this account. Try again in approximately ${remainingDays} day(s).`,
  );
}