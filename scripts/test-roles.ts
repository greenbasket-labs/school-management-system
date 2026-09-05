import { db } from "../src/prisma/db";
import {
  getRoles,
  getUserRolesById,
  assignRoleToUser,
} from "../src/lib/roles";

async function main() {
  const roles = await getRoles();

  console.log(
    "ROLES:",
    roles.map((role) => ({
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
    })),
  );

  const userId = 1;

  console.log(
    "OWNER CURRENT ROLES:",
    (await getUserRolesById(userId)).map(
      (role) => role.name,
    ),
  );

  const teacherRole = roles.find(
    (role) => role.name === "Teacher",
  );

  if (!teacherRole) {
    throw new Error("Teacher role not found");
  }

  await assignRoleToUser(userId, teacherRole.id);

  console.log(
    "OWNER ROLES AFTER TEST ASSIGNMENT:",
    (await getUserRolesById(userId)).map(
      (role) => role.name,
    ),
  );

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});