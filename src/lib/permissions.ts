import { db } from "../prisma/db";

export async function getUserRoles(userId: number) {
  const userRoles = await db.orm.public.UserRole.all();
  const roles = await db.orm.public.Role.all();

  const roleIds = userRoles
    .filter((userRole) => userRole.userId === userId)
    .map((userRole) => userRole.roleId);

  return roles.filter((role) => roleIds.includes(role.id));
}

export async function getUserPermissions(userId: number) {
  const users = await db.orm.public.User.all();
  const user = users.find((item) => item.id === userId);

  if (!user || user.status !== "ACTIVE") {
    return [];
  }

  const userRoles = await db.orm.public.UserRole.all();
  const rolePermissions = await db.orm.public.RolePermission.all();
  const permissions = await db.orm.public.Permission.all();

  const roleIds = userRoles
    .filter((userRole) => userRole.userId === userId)
    .map((userRole) => userRole.roleId);

  const permissionIds = rolePermissions
    .filter((rolePermission) =>
      roleIds.includes(rolePermission.roleId),
    )
    .map((rolePermission) => rolePermission.permissionId);

  return permissions.filter((permission) =>
    permissionIds.includes(permission.id),
  );
}

export async function hasPermission(
  userId: number,
  permissionCode: string,
) {
  const permissions = await getUserPermissions(userId);

  return permissions.some(
    (permission) => permission.code === permissionCode,
  );
}

export async function requirePermission(
  userId: number,
  permissionCode: string,
) {
  const allowed = await hasPermission(
    userId,
    permissionCode,
  );

  if (!allowed) {
    throw new Error(
      `Permission denied: ${permissionCode}`,
    );
  }

  return true;
}