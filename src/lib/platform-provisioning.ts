import { randomUUID, timingSafeEqual } from "crypto";
import { Temporal } from "@js-temporal/polyfill";
import { db } from "../prisma/db";
import { registerSchool } from "./register";

export type PlatformProvisioningInput = {
  organizationId: string;
  applicationId: string;
  school: {
    name: string;
    motto?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    principalName?: string;
    registrationInfo?: string;
  };
  owner: {
    name: string;
    username: string;
    email?: string;
    phone?: string;
    password: string;
  };
  academic?: {
    sessionName: string;
    startDate: string;
    endDate: string;
    classes?: Array<{
      name: string;
      section?: string;
    }>;
    subjects?: Array<{
      name: string;
      code?: string;
    }>;
  };
};

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function optionalText(value: unknown) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") throw new Error("Invalid text value.");
  const trimmed = value.trim();
  return trimmed || undefined;
}

function parseDate(value: string, field: string) {
  try {
    return Temporal.PlainDate.from(value)
      .toZonedDateTime({ timeZone: "UTC" })
      .toInstant();
  } catch {
    throw new Error(`Invalid ${field}.`);
  }
}

function sameSecret(provided: string, expected: string) {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export function assertPlatformProvisioningSecret(provided: string | null) {
  const expected = process.env.PLATFORM_PROVISIONING_SECRET;

  if (!expected || !provided || !sameSecret(provided, expected)) {
    throw new Error("UNAUTHORIZED");
  }
}

export async function provisionFromPlatform(
  input: PlatformProvisioningInput,
) {
  const organizationId = requiredText(input.organizationId, "organizationId");
  const applicationId = requiredText(input.applicationId, "applicationId");

  const schoolName = requiredText(input.school?.name, "school.name");
  const ownerName = requiredText(input.owner?.name, "owner.name");
  const username = requiredText(input.owner?.username, "owner.username").toLowerCase();
  const password = requiredText(input.owner?.password, "owner.password");

  if (password.length < 8) {
    throw new Error("owner.password must be at least 8 characters.");
  }

  const academic = input.academic;

  let sessionName: string | undefined;
  let startDate: Temporal.Instant | undefined;
  let endDate: Temporal.Instant | undefined;
  let classes: Array<{ name: string; section: string | null }> = [];
  let subjects: Array<{ name: string; code: string | null }> = [];

  if (academic) {
    sessionName = requiredText(academic.sessionName, "academic.sessionName");
    startDate = parseDate(academic.startDate, "academic.startDate");
    endDate = parseDate(academic.endDate, "academic.endDate");

    if (Temporal.Instant.compare(endDate, startDate) <= 0) {
      throw new Error("academic.endDate must be after academic.startDate.");
    }

    classes = (academic.classes ?? []).map((item, index) => ({
      name: requiredText(item?.name, `academic.classes[${index}].name`),
      section: optionalText(item?.section) ?? null,
    }));

    subjects = (academic.subjects ?? []).map((item, index) => ({
      name: requiredText(item?.name, `academic.subjects[${index}].name`),
      code: optionalText(item?.code) ?? null,
    }));
  }

  const existingSchools = await db.orm.public.School.all();

  if (existingSchools.length > 0) {
    throw new Error("This database already has a school configured.");
  }

  const result = await registerSchool({
    schoolName,
    ownerName,
    username,
    email: optionalText(input.owner?.email),
    phone: optionalText(input.owner?.phone),
    password,
  });

  const schoolId = result.school.id;

  await db.orm.public.School.where({ id: schoolId }).update({
    motto: optionalText(input.school?.motto) ?? null,
    address: optionalText(input.school?.address) ?? null,
    phone: optionalText(input.school?.phone) ?? null,
    email: optionalText(input.school?.email) ?? null,
    website: optionalText(input.school?.website) ?? null,
    principalName: optionalText(input.school?.principalName) ?? null,
    registrationInfo: optionalText(input.school?.registrationInfo) ?? null,
  });

  if (sessionName && startDate && endDate) {
    const session = await db.orm.public.AcademicSession.create({
      schoolId,
      name: sessionName,
      status: "DRAFT",
      startDate,
      endDate,
    });

    for (const item of classes) {
      await db.orm.public.SchoolClass.create({
        schoolId,
        sessionId: session.id,
        name: item.name,
        section: item.section,
        classTeacherId: null,
        status: "ACTIVE",
      });
    }
  }

  for (const item of subjects) {
    await db.orm.public.Subject.create({
      schoolId,
      name: item.name,
      code: item.code,
      status: "ACTIVE",
    });
  }

  return {
    organizationId,
    applicationId,
    schoolId,
    ownerId: result.owner.id,
    permanentId: result.owner.permanentId,
    provisioningId: randomUUID(),
  };
}
