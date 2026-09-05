import { db } from "../src/prisma/db";

async function main() {
  const roles = await db.orm.public.Role.all();
  const permissions = await db.orm.public.Permission.all();
  const assignments = await db.orm.public.RolePermission.all();

  console.log(
    "ROLES:",
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
    })),
  );

  console.log("PERMISSIONS:", permissions.length);
  console.log("ROLE PERMISSIONS:", assignments.length);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});