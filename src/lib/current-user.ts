import { db } from "../prisma/db";
import { getSession } from "./session";

export async function getCurrentUser() {
  const session = await getSession();

  if (!session.userId) {
    return null;
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) => item.id === session.userId,
  );

  if (!user || user.status !== "ACTIVE") {
    session.destroy();
    return null;
  }

  return user;
}