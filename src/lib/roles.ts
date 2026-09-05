import { db } from "../prisma/db";

export async function getRoles() {
  return db.orm.public.Role.all();
}

export async function getUserRoleIds(userId: number) {
  const userRoles = await db.orm.public.UserRole.all();

  return userRoles
    .filter((userRole) => userRole.userId === userId)
    .map((userRole) => userRole.roleId);
}

export async function getUserRolesById(userId: number) {
  const roles = await db.orm.public.Role.all();
  const roleIds = await getUserRoleIds(userId);

  return roles.filter((role) => roleIds.includes(role.id));
}

export async function assignRoleToUser(
  userId: number,
  roleId: number,
) {
  const existing = await db.orm.public.UserRole.all();

  const alreadyAssigned = existing.some(
    (userRole) =>
      userRole.userId === userId &&
      userRole.roleId === roleId,
  );

  if (alreadyAssigned) {
    return existing.find(
      (userRole) =>
        userRole.userId === userId &&
        userRole.roleId === roleId,
    );
  }

  return db.orm.public.UserRole.create({
    userId,
    roleId,
  });
}

export async function removeRoleFromUser(
  userId: number,
  roleId: number,
) {
  const userRoles = await db.orm.public.UserRole.all();

  const userRole = userRoles.find(
    (item) =>
      item.userId === userId &&
      item.roleId === roleId,
  );

  if (!userRole) {
    return false;
  }

  await db.orm.public.UserRole.where({
    id: userRole.id,
  }).delete();

  return true;
}