import { db } from "../prisma/db";
import { hashPassword } from "./auth";
import { writeAuditLog } from "./audit";

export async function registerSchool(input: {
  schoolName: string;
  ownerName: string;
  username: string;
  email?: string;
  phone?: string;
  password: string;
}) {
  const schoolName = input.schoolName.trim();
  const ownerName = input.ownerName.trim();
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;

  if (!schoolName) {
    throw new Error("School name is required.");
  }

  if (!ownerName) {
    throw new Error("Owner name is required.");
  }

  if (!username) {
    throw new Error("Username is required.");
  }

  if (!input.password) {
    throw new Error("Password is required.");
  }

  if (input.password.length < 8) {
    throw new Error(
      "Password must be at least 8 characters.",
    );
  }

  // Registration is only allowed on a completely fresh school database.
  const existingSchools =
    await db.orm.public.School.all();

  if (existingSchools.length > 0) {
    throw new Error(
      "This database already has a school configured.",
    );
  }

  // Make sure the RBAC system is initialized BEFORE
  // creating the school or owner account.
  const roles =
    await db.orm.public.Role.all();

  const ownerRole = roles.find(
    (role) => role.name === "Owner",
  );

  if (!ownerRole) {
    throw new Error(
      "Owner role is not initialized. Run the RBAC seed first.",
    );
  }

  const existingUsers =
    await db.orm.public.User.all();

  const existingUsername = existingUsers.find(
    (user) =>
      user.username?.toLowerCase() === username,
  );

  if (existingUsername) {
    throw new Error("Username is already in use.");
  }

  if (email) {
    const existingEmail = existingUsers.find(
      (user) =>
        user.email?.toLowerCase() === email,
    );

    if (existingEmail) {
      throw new Error("Email is already in use.");
    }
  }

  if (phone) {
    const existingPhone = existingUsers.find(
      (user) => user.phone === phone,
    );

    if (existingPhone) {
      throw new Error("Phone number is already in use.");
    }
  }

  const school =
    await db.orm.public.School.create({
      name: schoolName,
    });

  const passwordHash =
    await hashPassword(input.password);

  const year = new Date().getFullYear();

  const owner = await db.orm.public.User.create({
    schoolId: school.id,
    permanentId: `OWN-${year}-00001`,
    email,
    username,
    phone,
    passwordHash,
    name: ownerName,
    userType: "OWNER",
    status: "ACTIVE",
  });

  await db.orm.public.UserRole.create({
    userId: owner.id,
    roleId: ownerRole.id,
  });

  await writeAuditLog({
    schoolId: school.id,
    userId: owner.id,
    action: "CREATE",
    entity: "School",
    entityId: school.id,
    newValue: {
      name: school.name,
      ownerUserId: owner.id,
    },
  });

  return {
    school,
    owner,
  };
}