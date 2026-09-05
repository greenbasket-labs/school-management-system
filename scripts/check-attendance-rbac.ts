import { db } from "../src/prisma/db";

async function main() {
  const permissions = await db.orm.public.Permission.all();
  const roles = await db.orm.public.Role.all();
  const rolePermissions = await db.orm.public.RolePermission.all();

  const targetCodes = [
    "attendance.view",
    "attendance.mark",
    "attendance.edit",
  ];

  console.log("\nATTENDANCE PERMISSIONS:");

  for (const code of targetCodes) {
    const permission = permissions.find(
      (permission) => permission.code === code,
    );

    if (!permission) {
      console.log(`\n${code}: NOT FOUND`);
      continue;
    }

    console.log(`\n${code}: Permission ID ${permission.id}`);

    const assignedRoles = rolePermissions
      .filter(
        (rolePermission) =>
          rolePermission.permissionId === permission.id,
      )
      .map((rolePermission) =>
        roles.find(
          (role) => role.id === rolePermission.roleId,
        ),
      )
      .filter(Boolean);

    console.log(
      "Assigned roles:",
      assignedRoles.map((role) => ({
        id: role!.id,
        name: role!.name,
        isSystem: role!.isSystem,
      })),
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
