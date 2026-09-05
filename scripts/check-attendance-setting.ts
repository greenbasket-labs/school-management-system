import { db } from "../src/prisma/db";

async function main() {
  const settings =
    await db.orm.public.AttendanceSetting.all();

  console.log("ATTENDANCE SETTINGS:");
  console.log(settings);

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
