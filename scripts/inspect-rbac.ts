import { db } from "../src/prisma/db";

async function main() {
  const roles = await db.orm.public.Role.all();
  const permissions = await db.orm.public.Permission.all();
  const userRoles = await db.orm.public.UserRole.all();

  console.log("ROLES:", roles);
  console.log("PERMISSIONS:", permissions);
  console.log("USER ROLES:", userRoles);
}

main().catch(console.error);
