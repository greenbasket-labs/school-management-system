import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});

async function main() {
  await db.connect();

  const schools = await db.orm.public.School.all();

  console.log("SCHOOLS FOUND:", schools.length);

  for (const school of schools) {
    console.log("SCHOOL ID:", school.id);
    console.log("SCHOOL NAME:", school.name);
    console.log("MOTTO:", school.motto);
  }

  await db.close();
}

main().catch(async (error) => {
  console.error("TEST FAILED");
  console.error(error);

  await db.close();
  process.exit(1);
});