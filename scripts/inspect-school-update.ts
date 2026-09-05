import { db } from "../src/prisma/db";

const schools = await db.orm.public.School.all();
const school = schools[0];

if (!school) {
  throw new Error("School not found");
}

console.log("BEFORE:");
console.log(school);

const updated = await db.orm.public.School
  .where({ id: school.id })
  .update({
    name: school.name,
    motto: school.motto,
    address: school.address,
    phone: school.phone,
    email: school.email,
    website: school.website,
    principalName: school.principalName,
    registrationInfo: school.registrationInfo,
  });

console.log("UPDATE RESULT:");
console.log(updated);