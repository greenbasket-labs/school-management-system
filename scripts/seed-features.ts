import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };

const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});

const features = [
  {
    featureCode: "students",
    name: "Students",
    description: "Student registration, profiles and records",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 1,
  },
  {
    featureCode: "teachers",
    name: "Teachers",
    description: "Teacher profiles and academic assignments",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 2,
  },
  {
    featureCode: "academics",
    name: "Academics",
    description: "Classes, subjects, sessions and terms",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 3,
  },
  {
    featureCode: "finance",
    name: "Fees & Finance",
    description: "Fees, payments, balances and receipts",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 4,
  },
  {
    featureCode: "attendance",
    name: "Attendance",
    description: "Daily student attendance management",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 5,
  },
  {
    featureCode: "exams",
    name: "Exams & Results",
    description: "Examinations, grading, positions and results",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 6,
  },
  {
    featureCode: "report_cards",
    name: "Report Cards",
    description: "Generate academic report cards",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 7,
  },
  {
    featureCode: "communication",
    name: "Announcements",
    description: "School announcements and notifications",
    category: "CORE",
    status: "AVAILABLE",
    enabled: true,
    isCore: true,
    sortOrder: 8,
  },
  {
    featureCode: "whatsapp",
    name: "WhatsApp Communication",
    description: "Send school messages and fee reminders through WhatsApp",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 20,
  },
  {
    featureCode: "sms",
    name: "SMS Communication",
    description: "Send school notifications by SMS",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 21,
  },
  {
    featureCode: "online_payments",
    name: "Online Payments",
    description: "Allow parents to make school payments online",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 22,
  },
  {
    featureCode: "transport",
    name: "School Transport",
    description: "Manage school transport and routes",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 23,
  },
  {
    featureCode: "library",
    name: "Library",
    description: "Manage books and library activities",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 24,
  },
  {
    featureCode: "inventory",
    name: "Inventory",
    description: "Manage school items and stock",
    category: "OPTIONAL",
    status: "AVAILABLE",
    enabled: false,
    isCore: false,
    sortOrder: 25,
  },
  {
    featureCode: "payroll",
    name: "Payroll",
    description: "Manage staff payroll and salary processing",
    category: "FUTURE",
    status: "COMING_SOON",
    enabled: false,
    isCore: false,
    sortOrder: 40,
  },
  {
    featureCode: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Advanced school performance and financial analytics",
    category: "FUTURE",
    status: "COMING_SOON",
    enabled: false,
    isCore: false,
    sortOrder: 41,
  },
];

async function main() {
  await db.connect();

  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("No school found");
  }

  const school = schools[0];

  for (const feature of features) {
    const existing = await db.orm.public.SchoolFeature
      .where({
        schoolId: school.id,
        featureCode: feature.featureCode,
      })
      .first();

    if (existing) {
      await db.orm.public.SchoolFeature
        .where({ id: existing.id })
        .update(feature);
    } else {
      await db.orm.public.SchoolFeature.create({
        schoolId: school.id,
        ...feature,
      });
    }
  }

  console.log("FEATURE MARKETPLACE SEEDED");
  console.log("School:", school.name);
  console.log("Features:", features.length);

  await db.close();
}

main().catch(async (error) => {
  console.error("FEATURE SEED FAILED");
  console.error(error);
  await db.close();
  process.exit(1);
});