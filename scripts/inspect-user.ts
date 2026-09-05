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

  const user = db.orm.public.User;

  console.log("USER COLLECTION METHODS:");
  console.log(Object.getOwnPropertyNames(Object.getPrototypeOf(user)));

  console.log("");
  console.log("USER COLLECTION:");
  console.dir(user, { depth: 3 });

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
