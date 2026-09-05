import { db } from "../src/prisma/db";
import {
  getUserRoles,
  getUserPermissions,
  hasPermission,
} from "../src/lib/permissions";

async function main() {
  const userId = 1;

  const roles = await getUserRoles(userId);
  const permissions = await getUserPermissions(userId);

  console.log(
    "ROLES:",
    roles.map((role) => role.name),
  );

  console.log("PERMISSION COUNT:", permissions.length);

  console.log(
    "students.create:",
    await hasPermission(userId, "students.create"),
  );

  console.log(
    "payments.create:",
    await hasPermission(userId, "payments.create"),
  );

  console.log(
    "audit.view:",
    await hasPermission(userId, "audit.view"),
  );

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});