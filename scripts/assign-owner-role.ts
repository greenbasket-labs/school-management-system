import { db } from "../src/prisma/db";

async function main() {
  const users = await db.orm.public.User.all();
  const roles = await db.orm.public.Role.all();
  const userRoles = await db.orm.public.UserRole.all();

  const owner = users.find((user) => user.id === 1);
  const ownerRole = roles.find((role) => role.name === "Owner");

  if (!owner) {
    throw new Error("User ID 1 not found");
  }

  if (!ownerRole) {
    throw new Error("Owner role not found");
  }

  const alreadyAssigned = userRoles.some(
    (userRole) =>
      userRole.userId === owner.id &&
      userRole.roleId === ownerRole.id,
  );

  if (!alreadyAssigned) {
    await db.orm.public.UserRole.create({
      userId: owner.id,
      roleId: ownerRole.id,
    });

    console.log("OWNER ROLE ASSIGNED");
  } else {
    console.log("OWNER ROLE ALREADY ASSIGNED");
  }

  console.log("USER:", owner.name);
  console.log("PERMANENT ID:", owner.permanentId);
  console.log("ROLE:", ownerRole.name);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});