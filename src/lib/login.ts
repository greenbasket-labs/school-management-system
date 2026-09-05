import { db } from "../prisma/db";
import { verifyPassword } from "./auth";
import { getSession } from "./session";

export async function authenticateUser(
  login: string,
  password: string,
) {
  const users = await db.orm.public.User.all();

  const normalizedLogin = login.trim().toLowerCase();

  const user = users.find(
    (item) =>
      item.username?.toLowerCase() === normalizedLogin ||
      item.email?.toLowerCase() === normalizedLogin ||
      item.phone === login.trim(),
  );

  if (!user) {
    return null;
  }

  if (user.status !== "ACTIVE") {
    return null;
  }

  const validPassword = await verifyPassword(
    password,
    user.passwordHash,
  );

  if (!validPassword) {
    return null;
  }

  const session = await getSession();

  session.userId = user.id;

  await session.save();

  return user;
}