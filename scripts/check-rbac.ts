import { db } from "../src/prisma/db";

async function main() {
  const roles = await db.orm.public.Role.all();
  console.log("ROLES:", roles);

  const permissions = await db.orm.public.Permission.all();
  console.log("PERMISSIONS:", permissions);

  const userRoles = await db.orm.public.UserRole.all();
  console.log("USER ROLES:", userRoles);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
