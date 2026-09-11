import { db } from "../prisma/db";
import { getCurrentUser } from "./current-user";
import { writeAuditLog } from "./audit";

export async function getSchool() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.schoolId) {
    return null;
  }

  const schools = await db.orm.public.School.all();

  return schools.find((school) => school.id === currentUser.schoolId) ?? null;
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
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
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
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      fontFamily: input.fontFamily,
    });

  await writeAuditLog({
    schoolId: school.id,
    action: "UPDATE",
    entity: "School",
    entityId: school.id,
    oldValue: {
      name: school.name,
      motto: school.motto,
      address: school.address,
      phone: school.phone,
      email: school.email,
      website: school.website,
      principalName: school.principalName,
      registrationInfo: school.registrationInfo,
      primaryColor: school.primaryColor,
      secondaryColor: school.secondaryColor,
      accentColor: school.accentColor,
      fontFamily: school.fontFamily,
    },
    newValue: {
      name: input.name,
      motto: input.motto,
      address: input.address,
      phone: input.phone,
      email: input.email,
      website: input.website,
      principalName: input.principalName,
      registrationInfo: input.registrationInfo,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
      accentColor: input.accentColor,
      fontFamily: input.fontFamily,
    },
  });

  return true;
}