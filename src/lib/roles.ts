import { db } from "../prisma/db";
import { getSchool } from "./school";
import { writeAuditLog } from "./audit";
import { assertRoleChangeAllowed } from "./role-security";

export async function getRoles() {
  return db.orm.public.Role.all();
}

export async function getUserRoleIds(userId: number) {
  const school = await getSchool();

  if (!school) {
    throw new Error("School not found.");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    throw new Error("User not found.");
  }

  const userRoles = await db.orm.public.UserRole.all();

  return userRoles
    .filter((userRole) => userRole.userId === userId)
    .map((userRole) => userRole.roleId);
}

export async function getUserRolesById(userId: number) {
  const roleIds = await getUserRoleIds(userId);
  const roles = await getRoles();

  return roles.filter((role) =>
    roleIds.includes(role.id),
  );
}

export async function assignRoleToUser(
  userId: number,
  roleId: number,
) {
  const school = await getSchool();

  if (!school) {
    throw new Error("School not found.");
  }

  await assertRoleChangeAllowed(
    userId,
    school.id,
  );

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    throw new Error("User not found.");
  }

  const roles = await getRoles();

  const role = roles.find(
    (item) => item.id === roleId,
  );

  if (!role) {
    throw new Error("Role not found.");
  }

  const existing =
    await db.orm.public.UserRole.all();

  const alreadyAssigned = existing.some(
    (userRole) =>
      userRole.userId === userId &&
      userRole.roleId === roleId,
  );

  if (alreadyAssigned) {
    return;
  }

  const userRole =
    await db.orm.public.UserRole.create({
      userId,
      roleId,
    });

  await writeAuditLog({
    schoolId: school.id,
    userId: user.id,
    action: "ASSIGN_ROLE",
    entity: "UserRole",
    entityId: userRole.id,
    newValue: {
      roleId,
      roleName: role.name,
    },
  });

  return userRole;
}

export async function removeRoleFromUser(
  userId: number,
  roleId: number,
) {
  const school = await getSchool();

  if (!school) {
    throw new Error("School not found.");
  }

  await assertRoleChangeAllowed(
    userId,
    school.id,
  );

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    throw new Error("User not found.");
  }

  const roles = await getRoles();

  const role = roles.find(
    (item) => item.id === roleId,
  );

  if (!role) {
    throw new Error("Role not found.");
  }

  const userRoles =
    await db.orm.public.UserRole.all();

  const userRole = userRoles.find(
    (item) =>
      item.userId === userId &&
      item.roleId === roleId,
  );

  if (!userRole) {
    return false;
  }

  await db.orm.public.UserRole
    .where({
      id: userRole.id,
    })
    .delete();

  await writeAuditLog({
    schoolId: school.id,
    userId: user.id,
    action: "REMOVE_ROLE",
    entity: "UserRole",
    entityId: userRole.id,
    oldValue: {
      roleId,
      roleName: role.name,
    },
  });

  return true;
}