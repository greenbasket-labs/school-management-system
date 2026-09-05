import { db } from "../src/prisma/db";
import { removeRoleFromUser } from "../src/lib/roles";

async function main() {
  const ownerUserId = 1;
  const teacherRoleId = 3;

  const removed = await removeRoleFromUser(
    ownerUserId,
    teacherRoleId,
  );

  console.log(
    removed
      ? "TEST ROLE REMOVED"
      : "TEST ROLE WAS NOT ASSIGNED",
  );

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});