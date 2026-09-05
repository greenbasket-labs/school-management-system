import { db } from "../prisma/db";

export async function getSchool() {
const schools = await db.orm.public.School.all();

return schools[0] ?? null;
}

export async function updateSchool(input: {
name: string;
motto: string;
address: string;
phone: string;
email: string;
website: string;
principalName: string;
registrationInfo: string;
}) {
const school = await getSchool();

if (!school) {
throw new Error("School not found");
}

await db.orm.public.School
.where({ id: school.id })
.update({
name: input.name,
motto: input.motto,
address: input.address,
phone: input.phone,
email: input.email,
website: input.website,
principalName: input.principalName,
registrationInfo: input.registrationInfo,
});

return true;
}
