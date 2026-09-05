import { db } from "../src/prisma/db";
import { assignRoleToUser } from "../src/lib/roles";

async function main() {
  const userId = 2;
  const teacherRoleId = 3;

  await assignRoleToUser(
    userId,
    teacherRoleId,
  );

  console.log(
    "TEACHER ROLE ASSIGNED",
  );

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});