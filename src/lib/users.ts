import { db } from "../prisma/db";
import { hashPassword } from "./auth";
import { getSchool } from "./school";
import { writeAuditLog } from "./audit";

const PREFIXES: Record<string, string> = {
  OWNER: "OWN",
  ADMIN: "ADM",
  TEACHER: "TEA",
  CASHIER: "CSH",
  STUDENT: "STU",
  PARENT: "PAR",
  STAFF: "STF",
};

export async function createUser(input: {
  name: string;
  userType:
    | "ADMIN"
    | "TEACHER"
    | "CASHIER"
    | "STUDENT"
    | "PARENT"
    | "STAFF";
  email?: string;
  phone?: string;
  username?: string;
  password: string;
}) {
  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  const name = input.name.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  const username = input.username?.trim().toLowerCase() || null;

  if (!name) {
    throw new Error("Full name is required");
  }

  if (!input.password) {
    throw new Error("Password is required");
  }

  const prefix = PREFIXES[input.userType];

  if (!prefix) {
    throw new Error("Invalid user type");
  }

  const users = await db.orm.public.User.all();

  const year = new Date().getFullYear();
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);

  let highestNumber = 0;

  for (const user of users) {
    const match = user.permanentId.match(pattern);

    if (match) {
      highestNumber = Math.max(
        highestNumber,
        Number(match[1]),
      );
    }
  }

  const permanentId = `${prefix}-${year}-${String(
    highestNumber + 1,
  ).padStart(5, "0")}`;

  const passwordHash = await hashPassword(input.password);

  const user = await db.orm.public.User.create({
    schoolId: school.id,
    permanentId,
    email,
    username,
    phone,
    passwordHash,
    name,
    userType: input.userType,
    status: "ACTIVE",
  });

  await writeAuditLog({
    schoolId: school.id,
    action: "CREATE",
    entity: "User",
    entityId: user.id,
    newValue: {
      permanentId: user.permanentId,
      name: user.name,
      userType: user.userType,
      email: user.email,
      phone: user.phone,
      username: user.username,
      status: user.status,
    },
  });

  return user;
}