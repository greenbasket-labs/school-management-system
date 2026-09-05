import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };
import { hashPassword } from "../src/lib/auth";

const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});

async function main() {
  await db.connect();

  const school = {
    id: 1,
    name: "Demo School",
  };

  const passwordHash = await hashPassword("Admin@12345");

  const owner = await db.orm.public.User.create({
    schoolId: school.id,
    permanentId: "OWN-2026-00001",
    email: "admin@demoschool.test",
    username: "admin",
    phone: "+2348000000000",
    passwordHash,
    name: "School Owner",
    userType: "OWNER",
    status: "ACTIVE",
  });

  console.log("OWNER ACCOUNT CREATED");
  console.log("School:", school.name);
  console.log("User ID:", owner.id);
  console.log("Permanent ID:", owner.permanentId);
  console.log("Username:", owner.username);
  console.log("Email:", owner.email);
  console.log("Password: Admin@12345");

  await db.close();
}

main().catch(async (error) => {
  console.error("SEED FAILED");
  console.error(error);

  await db.close();
  process.exit(1);
});