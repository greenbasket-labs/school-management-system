import { db } from "../src/prisma/db";

async function main() {
  for (const userId of [1, 2]) {
    const userRoles = await db.orm.public.UserRole.all();
    const rolePermissions = await db.orm.public.RolePermission.all();
    const permissions = await db.orm.public.Permission.all();
    const roles = await db.orm.public.Role.all();

    const roleIds = userRoles
      .filter((item) => item.userId === userId)
      .map((item) => item.roleId);

    const userRoleNames = roles
      .filter((role) => roleIds.includes(role.id))
      .map((role) => role.name);

    const permissionIds = rolePermissions
      .filter((item) => roleIds.includes(item.roleId))
      .map((item) => item.permissionId);

    const userPermissions = permissions
      .filter((permission) => permissionIds.includes(permission.id))
      .map((permission) => permission.code);

    console.log(`USER ${userId}`);
    console.log("ROLES:", userRoleNames);
    console.log("PERMISSION COUNT:", userPermissions.length);
    console.log("PERMISSIONS:", userPermissions);
    console.log("--------------------------------");
  }

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
