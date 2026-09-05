import { db } from "../src/prisma/db";

async function main() {
  const records =
    await db.orm.public.AttendanceRecord.all();

  console.log("\nATTENDANCE RECORDS:\n");

  for (const record of records) {
    console.log({
      id: record.id,
      schoolId: record.schoolId,
      studentId: record.studentId,
      classId: record.classId,
      attendanceDate: record.attendanceDate,
      period: record.period,
      status: record.status,
      markedByUserId: record.markedByUserId,
    });
  }

  await db.close();
}

main().catch(async (error) => {
  console.error(error);
  await db.close();
  process.exit(1);
});