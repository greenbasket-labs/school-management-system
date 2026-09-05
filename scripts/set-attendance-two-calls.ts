import { db } from "../src/prisma/db";

async function main() {
  const schools = await db.orm.public.School.all();

  const school = schools.find(
    (item) => item.name === "Greenfield International School",
  );

  if (!school) {
    throw new Error("Greenfield International School not found.");
  }

  const existing =
    await db.orm.public.AttendanceSetting.all();

  const current = existing.find(
    (setting) => setting.schoolId === school.id,
  );

  if (current) {
    const updated =
      await db.orm.public.AttendanceSetting
        .where({ id: current.id })
        .update({
          callsPerDay: 2,
        });

    console.log("ATTENDANCE SETTING UPDATED:");
    console.log(updated);
  } else {
    const created =
      await db.orm.public.AttendanceSetting.create({
        schoolId: school.id,
        callsPerDay: 2,
      });

    console.log("ATTENDANCE SETTING CREATED:");
    console.log(created);
  }

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});
