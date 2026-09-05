import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };
import { verifyPassword } from "../src/lib/auth";

const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});

async function main() {
  await db.connect();

  const users = await db.orm.public.User.all();

  console.log("USERS FOUND:", users.length);

  const owner = users.find(
    (user) => user.username === "admin"
  );

  if (!owner) {
    throw new Error("Owner account was not found.");
  }

  const valid = await verifyPassword(
    "Admin@12345",
    owner.passwordHash
  );

  console.log("USERNAME:", owner.username);
  console.log("PASSWORD VERIFIED:", valid);

  await db.close();
}

main().catch(async (error) => {
  console.error("AUTH TEST FAILED");
  console.error(error);

  await db.close();
  process.exit(1);
});
