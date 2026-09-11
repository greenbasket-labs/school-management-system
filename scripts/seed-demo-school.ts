import "dotenv/config";
import postgres from "@prisma/orm-postgres/runtime";
import type { Contract } from "../src/prisma/contract.d";
import contractJson from "../src/prisma/contract.json" with { type: "json" };
import { hashPassword } from "../src/lib/auth";

const db = postgres<Contract>({
  contractJson,
  url: process.env["DATABASE_URL"]!,
});

const DEMO_NAME = "Green Basket Demo School";
const DEMO_PASSWORD = "Demo@12345";
const SESSION_START = new Date("2025-09-01T00:00:00.000Z");
const SESSION_END = new Date("2026-07-31T23:59:59.000Z");

const subjects = [
  ["ENG", "English Language"],
  ["MTH", "Mathematics"],
  ["BSC", "Basic Science"],
  ["BST", "Basic Technology"],
  ["CIV", "Civic Education"],
  ["ICT", "Computer Studies"],
  ["BIO", "Biology"],
  ["CHE", "Chemistry"],
  ["PHY", "Physics"],
  ["ECO", "Economics"],
  ["GOV", "Government"],
  ["LIT", "Literature in English"],
];

const classNames = [
  "JSS1 A", "JSS2 A", "JSS3 A",
  "SS1 A", "SS1 B", "SS2 A", "SS2 B", "SS3 A", "SS3 B",
];

const firstNames = [
  "Aisha", "Abdul", "Maryam", "Ibrahim", "Fatima", "Yusuf", "Hauwa", "Musa",
  "Zainab", "Sani", "Amina", "Usman", "Khadija", "Bello", "Rahma", "Ahmed",
  "Safiya", "Mustapha", "Asma", "Adam", "Hadiza", "Ismail", "Nafisa", "Aliyu",
];

const lastNames = [
  "Abdullahi", "Mohammed", "Ibrahim", "Yusuf", "Bello", "Sani", "Usman", "Musa",
  "Garba", "Lawal", "Ahmad", "Suleiman", "Adamu", "Umar", "Shehu", "Kabir",
  "Danladi", "Ado", "Salihu", "Bashir",
];

function dateAt(month: number, day: number, hour = 8) {
  return new Date(Date.UTC(2025 + Math.floor((month - 1) / 12), (month - 1) % 12, day, hour));
}

function attendanceDate(offset: number) {
  const start = new Date("2025-09-08T00:00:00.000Z");
  start.setUTCDate(start.getUTCDate() + offset);
  return start;
}

function gradeFor(mark: number) {
  if (mark >= 75) return "A";
  if (mark >= 65) return "B";
  if (mark >= 55) return "C";
  if (mark >= 45) return "D";
  if (mark >= 40) return "E";
  return "F";
}

async function createUser(input: {
  schoolId: number;
  permanentId: string;
  username: string;
  name: string;
  userType: "OWNER" | "ADMIN" | "TEACHER" | "CASHIER" | "STUDENT" | "PARENT" | "STAFF";
  email?: string;
  phone?: string;
  roleNames?: string[];
}) {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const user = await db.orm.public.User.create({
    schoolId: input.schoolId,
    permanentId: input.permanentId,
    email: input.email ?? null,
    username: input.username,
    phone: input.phone ?? null,
    passwordHash,
    name: input.name,
    userType: input.userType,
    status: "ACTIVE",
  });

  const roles = await db.orm.public.Role.all();
  for (const roleName of input.roleNames ?? []) {
    const role = roles.find((r) => r.name.toLowerCase() === roleName.toLowerCase());
    if (role) {
      await db.orm.public.UserRole.create({ userId: user.id, roleId: role.id });
    }
  }

  return user;
}

async function main() {
  if (process.env["DEMO_SEED"] !== "true") {
    throw new Error("Demo seed blocked. Set DEMO_SEED=true in the dedicated demo environment.");
  }

  await db.connect();

  const existingSchools = await db.orm.public.School.all();
  if (existingSchools.length > 0) {
    throw new Error("Demo seed expects a dedicated empty database. Refusing to modify an existing school database.");
  }

  const roles = await db.orm.public.Role.all();
  const ownerRole = roles.find((role) => role.name.toLowerCase() === "owner");
  if (!ownerRole) {
    throw new Error("RBAC is not initialized. Run the normal RBAC seed before the demo seed.");
  }

  const school = await db.orm.public.School.create({
    name: DEMO_NAME,
    address: "Plot 18, Gwarinpa District, Abuja, Nigeria",
    phone: "+234 800 000 1000",
    email: "demo@greenbasket.school",
    website: "https://greenbasket.school",
    motto: "Learning Today. Leading Tomorrow.",
    principalName: "Mrs. Grace Ibrahim",
    registrationInfo: "Demo institution for Green Basket product demonstration",
  });

  const owner = await createUser({
    schoolId: school.id,
    permanentId: "OWN-2025-00001",
    username: "owner",
    name: "Grace Ibrahim",
    userType: "OWNER",
    email: "owner@demo.greenbasket.school",
    phone: "+2348000001001",
    roleNames: ["Owner"],
  });

  const admin = await createUser({
    schoolId: school.id,
    permanentId: "ADM-2025-00001",
    username: "admin",
    name: "Daniel Okafor",
    userType: "ADMIN",
    email: "admin@demo.greenbasket.school",
    phone: "+2348000001002",
    roleNames: ["Admin", "Administrator"],
  });

  const cashier = await createUser({
    schoolId: school.id,
    permanentId: "CAS-2025-00001",
    username: "cashier",
    name: "Janet Musa",
    userType: "CASHIER",
    email: "cashier@demo.greenbasket.school",
    phone: "+2348000001003",
    roleNames: ["Cashier"],
  });

  const session = await db.orm.public.AcademicSession.create({
    schoolId: school.id,
    name: "2025/2026 Academic Session",
    status: "ACTIVE",
    startDate: SESSION_START,
    endDate: SESSION_END,
  });

  const term1 = await db.orm.public.Term.create({
    sessionId: session.id,
    term: "FIRST",
    name: "First Term",
    startDate: new Date("2025-09-01T00:00:00.000Z"),
    endDate: new Date("2025-12-19T23:59:59.000Z"),
    isActive: false,
  });
  const term2 = await db.orm.public.Term.create({
    sessionId: session.id,
    term: "SECOND",
    name: "Second Term",
    startDate: new Date("2026-01-05T00:00:00.000Z"),
    endDate: new Date("2026-04-02T23:59:59.000Z"),
    isActive: false,
  });
  const term3 = await db.orm.public.Term.create({
    sessionId: session.id,
    term: "THIRD",
    name: "Third Term",
    startDate: new Date("2026-04-20T00:00:00.000Z"),
    endDate: new Date("2026-07-31T23:59:59.000Z"),
    isActive: true,
  });
  const terms = [term1, term2, term3];

  await db.orm.public.AttendanceSetting.create({ schoolId: school.id, callsPerDay: 1 });

  const featureDefinitions = [
    ["PORTAL", "School Portal", "PORTAL"],
    ["PROFILE", "Profiles", "PORTAL"],
    ["ATTENDANCE", "Attendance", "PORTAL"],
    ["RESULTS", "Results", "PORTAL"],
    ["REPORT_CARDS", "Report Cards", "PORTAL"],
    ["FEES", "Fees", "PORTAL"],
    ["RECEIPTS", "Receipts", "PORTAL"],
    ["ANNOUNCEMENTS", "Announcements", "PORTAL"],
    ["MESSAGES", "Messages", "PORTAL"],
    ["DOCUMENTS", "Documents", "PORTAL"],
    ["REQUESTS", "Requests", "PORTAL"],
    ["PAYMENTS", "Payments", "PORTAL"],
  ];
  for (let i = 0; i < featureDefinitions.length; i++) {
    const [featureCode, name, category] = featureDefinitions[i];
    await db.orm.public.SchoolFeature.create({
      schoolId: school.id,
      featureCode,
      name,
      description: `Demo ${name.toLowerCase()} feature`,
      category,
      status: "AVAILABLE",
      enabled: true,
      isCore: ["PORTAL", "PROFILE", "ATTENDANCE", "RESULTS", "REPORT_CARDS", "FEES", "RECEIPTS", "ANNOUNCEMENTS", "PAYMENTS"].includes(featureCode),
      sortOrder: i,
    });
  }

  const teacherRecords: Array<{ id: number; userId: number; firstName: string; lastName: string }> = [];
  const teacherNames = [
    ["Samuel", "Adeyemi"], ["Blessing", "Okoro"], ["Fatima", "Bello"], ["David", "Yakubu"],
    ["Hauwa", "Sani"], ["Michael", "Eze"], ["Amina", "Garba"], ["Peter", "Umar"],
    ["Mary", "Joseph"], ["Ibrahim", "Lawal"], ["Janet", "Musa"], ["Emeka", "Nwosu"],
  ];
  for (let i = 0; i < teacherNames.length; i++) {
    const [firstName, lastName] = teacherNames[i];
    const user = await createUser({
      schoolId: school.id,
      permanentId: `TCH-2025-${String(i + 1).padStart(5, "0")}`,
      username: `teacher${i + 1}`,
      name: `${firstName} ${lastName}`,
      userType: "TEACHER",
      email: `teacher${i + 1}@demo.greenbasket.school`,
      phone: `+234801000${String(i + 1).padStart(4, "0")}`,
      roleNames: ["Teacher"],
    });
    const teacher = await db.orm.public.Teacher.create({
      schoolId: school.id,
      userId: user.id,
      permanentId: `TCH-2025-${String(i + 1).padStart(5, "0")}`,
      firstName,
      lastName,
      phone: user.phone,
      email: user.email,
      status: "ACTIVE",
    });
    teacherRecords.push({ id: teacher.id, userId: user.id, firstName, lastName });
  }

  const subjectRecords: Array<{ id: number; name: string; code: string }> = [];
  for (const [code, name] of subjects) {
    const subject = await db.orm.public.Subject.create({
      schoolId: school.id,
      code,
      name,
      status: "ACTIVE",
    });
    subjectRecords.push({ id: subject.id, name, code });
  }

  const classes: Array<{ id: number; name: string; teacherId: number }> = [];
  for (let i = 0; i < classNames.length; i++) {
    const teacher = teacherRecords[i % teacherRecords.length];
    const [name, section] = classNames[i].split(" ");
    const schoolClass = await db.orm.public.SchoolClass.create({
      schoolId: school.id,
      sessionId: session.id,
      name,
      section,
      classTeacherId: teacher.id,
      status: "ACTIVE",
    });
    classes.push({ id: schoolClass.id, name: classNames[i], teacherId: teacher.id });
  }

  for (const schoolClass of classes) {
    for (let i = 0; i < subjectRecords.length; i++) {
      const subject = subjectRecords[i];
      await db.orm.public.ClassSubject.create({
        classId: schoolClass.id,
        subjectId: subject.id,
        teacherId: teacherRecords[(i + classes.indexOf(schoolClass)) % teacherRecords.length].id,
      });
    }
  }

  const students: Array<{ id: number; userId: number | null; classId: number; firstName: string; lastName: string; index: number }> = [];
  const parents: Array<{ id: number; userId: number; studentId: number }> = [];

  for (let i = 0; i < 120; i++) {
    const classRecord = classes[i % classes.length];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const studentPortal = i % 10 === 0;
    let studentUserId: number | null = null;

    if (studentPortal) {
      const studentUser = await createUser({
        schoolId: school.id,
        permanentId: `STU-2025-${String(i + 1).padStart(5, "0")}`,
        username: `student${i + 1}`,
        name: `${firstName} ${lastName}`,
        userType: "STUDENT",
        email: `student${i + 1}@demo.greenbasket.school`,
        phone: `+234802000${String(i + 1).padStart(4, "0")}`,
        roleNames: ["Student"],
      });
      studentUserId = studentUser.id;
    }

    const student = await db.orm.public.Student.create({
      schoolId: school.id,
      userId: studentUserId,
      permanentId: `STU-2025-${String(i + 1).padStart(5, "0")}`,
      firstName,
      middleName: i % 4 === 0 ? "Musa" : null,
      lastName,
      dateOfBirth: new Date(Date.UTC(2007 + (i % 8), i % 12, 5 + (i % 20))),
      gender: i % 2 === 0 ? "FEMALE" : "MALE",
      phone: `+234802000${String(i + 1).padStart(4, "0")}`,
      address: `${10 + (i % 90)} Demo Street, Abuja`,
      admissionDate: new Date("2025-09-01T00:00:00.000Z"),
      status: "ACTIVE",
      currentClassId: classRecord.id,
    });

    await db.orm.public.StudentClassHistory.create({
      studentId: student.id,
      classId: classRecord.id,
      sessionId: session.id,
      startDate: SESSION_START,
      isCurrent: true,
    });

    const parentUser = await createUser({
      schoolId: school.id,
      permanentId: `PAR-2025-${String(i + 1).padStart(5, "0")}`,
      username: `parent${i + 1}`,
      name: `Parent of ${firstName} ${lastName}`,
      userType: "PARENT",
      email: `parent${i + 1}@demo.greenbasket.school`,
      phone: `+234803000${String(i + 1).padStart(4, "0")}`,
      roleNames: ["Parent"],
    });

    const parent = await db.orm.public.Parent.create({
      schoolId: school.id,
      userId: parentUser.id,
      permanentId: `PAR-2025-${String(i + 1).padStart(5, "0")}`,
      firstName: "Parent",
      lastName: `${lastName} Family`,
      phone: parentUser.phone,
      email: parentUser.email,
      address: `${20 + (i % 70)} Family Avenue, Abuja`,
      status: "ACTIVE",
    });

    await db.orm.public.StudentParent.create({
      studentId: student.id,
      parentId: parent.id,
      relationship: i % 3 === 0 ? "Mother" : "Father",
      isPrimary: true,
    });

    students.push({ id: student.id, userId: studentUserId, classId: classRecord.id, firstName, lastName, index: i });
    parents.push({ id: parent.id, userId: parentUser.id, studentId: student.id });
  }

  const feeTypeNames = [
    ["Tuition", "Core school tuition"],
    ["Development Levy", "School development contribution"],
    ["Transport", "Optional school transport"],
    ["Examination", "Assessment and examination charge"],
  ];
  const feeTypes: Array<{ id: number; name: string }> = [];
  for (const [name, description] of feeTypeNames) {
    const feeType = await db.orm.public.FeeType.create({
      schoolId: school.id,
      name,
      description,
      status: "ACTIVE",
    });
    feeTypes.push({ id: feeType.id, name });
  }

  for (let termIndex = 0; termIndex < terms.length; termIndex++) {
    const term = terms[termIndex];
    for (const student of students) {
      const classId = student.classId;
      const amounts = [120000, 30000, 20000, 10000];
      for (let f = 0; f < feeTypes.length; f++) {
        await db.orm.public.FeeAssignment.create({
          schoolId: school.id,
          studentId: student.id,
          feeTypeId: feeTypes[f].id,
          sessionId: session.id,
          termId: term.id,
          classId,
          amount: amounts[f],
          dueDate: new Date(term.startDate),
          description: `${feeTypes[f].name} — ${term.name}`,
          status: "ACTIVE",
        });
      }
    }
  }

  const allFeeAssignments = await db.orm.public.FeeAssignment.all();
  for (const student of students) {
    const assignments = allFeeAssignments.filter((a) => a.studentId === student.id);
    for (let termIndex = 0; termIndex < terms.length; termIndex++) {
      const termAssignments = assignments.filter((a) => a.termId === terms[termIndex].id);
      const total = termAssignments.reduce((sum, a) => sum + Number(a.amount), 0);
      const paymentAmount = student.index % 10 === 0 ? total : student.index % 3 === 0 ? 150000 : 100000;
      const paymentDate = new Date(terms[termIndex].startDate);
      paymentDate.setUTCDate(paymentDate.getUTCDate() + 12 + (student.index % 12));
      const payment = await db.orm.public.Payment.create({
        schoolId: school.id,
        studentId: student.id,
        cashierUserId: cashier.id,
        amount: paymentAmount,
        method: student.index % 4 === 0 ? "BANK_TRANSFER" : student.index % 4 === 1 ? "POS" : "CASH",
        paymentDate,
        reference: `DEMO-${termIndex + 1}-${String(student.index + 1).padStart(4, "0")}`,
        description: `${terms[termIndex].name} school fees payment`,
        status: "COMPLETED",
      });

      let remaining = paymentAmount;
      for (const assignment of termAssignments) {
        if (remaining <= 0) break;
        const allocated = Math.min(remaining, Number(assignment.amount));
        if (allocated <= 0) continue;
        await db.orm.public.PaymentAllocation.create({
          schoolId: school.id,
          paymentId: payment.id,
          feeAssignmentId: assignment.id,
          studentId: student.id,
          amount: allocated,
        });
        remaining -= allocated;
      }

      await db.orm.public.Receipt.create({
        schoolId: school.id,
        paymentId: payment.id,
        receiptNumber: `GB-DEMO-${String(payment.id).padStart(6, "0")}`,
      });
    }
  }

  const exams = [] as Array<{ id: number; classId: number; termId: number }>;
  for (let termIndex = 0; termIndex < terms.length; termIndex++) {
    for (let classIndex = 0; classIndex < classes.length; classIndex++) {
      const term = terms[termIndex];
      const classRecord = classes[classIndex];
      const examDate = new Date(term.startDate);
      examDate.setUTCDate(examDate.getUTCDate() + 55);
      const exam = await db.orm.public.Exam.create({
        schoolId: school.id,
        sessionId: session.id,
        termId: term.id,
        classId: classRecord.id,
        name: `${term.name} Examination`,
        startDate: examDate,
        endDate: new Date(examDate.getTime() + 5 * 86400000),
        status: "PUBLISHED",
        isActive: true,
      });
      exams.push({ id: exam.id, classId: classRecord.id, termId: term.id });

      for (let subjectIndex = 0; subjectIndex < subjectRecords.length; subjectIndex++) {
        const subject = subjectRecords[subjectIndex];
        const examSubject = await db.orm.public.ExamSubject.create({
          examId: exam.id,
          subjectId: subject.id,
          maxMark: 100,
          isActive: true,
        });
        const ca = await db.orm.public.AssessmentComponent.create({
          examSubjectId: examSubject.id,
          name: "Continuous Assessment",
          maxMark: 30,
          sortOrder: 1,
          isActive: true,
        });
        const examMark = await db.orm.public.AssessmentComponent.create({
          examSubjectId: examSubject.id,
          name: "Examination",
          maxMark: 70,
          sortOrder: 2,
          isActive: true,
        });

        const classStudents = students.filter((student) => student.classId === classRecord.id);
        const orderedScores = classStudents.map((student) => {
          const base = 48 + ((student.index * 17 + subjectIndex * 11 + termIndex * 7) % 48);
          return { student, total: Math.min(96, base) };
        });
        const sorted = [...orderedScores].sort((a, b) => b.total - a.total);

        for (const score of orderedScores) {
          const caMark = Math.round(score.total * 0.3);
          const examMarkValue = score.total - caMark;
          const position = sorted.findIndex((item) => item.student.id === score.student.id) + 1;
          const result = await db.orm.public.Result.create({
            schoolId: school.id,
            examSubjectId: examSubject.id,
            studentId: score.student.id,
            totalMark: score.total,
            grade: gradeFor(score.total),
            position,
            status: "PUBLISHED",
            enteredByUserId: teacherRecords[(subjectIndex + classIndex) % teacherRecords.length].userId,
            updatedByUserId: teacherRecords[(subjectIndex + classIndex) % teacherRecords.length].userId,
          });
          await db.orm.public.ResultMark.create({ resultId: result.id, assessmentComponentId: ca.id, mark: caMark });
          await db.orm.public.ResultMark.create({ resultId: result.id, assessmentComponentId: examMark.id, mark: examMarkValue });
        }
      }
    }
  }

  for (let i = 0; i < 10; i++) {
    const teacher = teacherRecords[i % teacherRecords.length];
    await db.orm.public.StaffAttendanceRecord.create({
      schoolId: school.id,
      userId: teacher.userId,
      attendanceDate: new Date("2026-07-15T00:00:00.000Z"),
      checkInAt: new Date("2026-07-15T07:50:00.000Z"),
      checkOutAt: new Date("2026-07-15T16:05:00.000Z"),
      status: "PRESENT",
      lateMinutes: 0,
      missedCheckout: false,
    });
  }

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    for (let week = 0; week < 42; week++) {
      const day = attendanceDate(week * 7 + (i % 3));
      await db.orm.public.AttendanceRecord.create({
        schoolId: school.id,
        studentId: student.id,
        classId: student.classId,
        attendanceDate: day,
        period: "FIRST_PERIOD",
        status: (i + week) % 17 === 0 ? "ABSENT" : "PRESENT",
        markedByUserId: admin.id,
      });
    }
  }

  const announcements = [
    ["Welcome to the 2025/2026 Session", "We welcome all students, parents and staff to a new academic year.", "ALL"],
    ["First Term Results Published", "First term examination results are now available through the portal.", "STUDENT"],
    ["Fee Payment Reminder", "Parents are encouraged to review outstanding balances and keep payments up to date.", "PARENT"],
    ["Staff Meeting", "All teaching staff should review the staff notice before the next academic meeting.", "TEACHER"],
    ["Third Term Activities", "The school has published the major activities planned for the final term.", "ALL"],
  ];
  for (let i = 0; i < announcements.length; i++) {
    const [title, message, audience] = announcements[i];
    await db.orm.public.Announcement.create({
      schoolId: school.id,
      createdByUserId: owner.id,
      title,
      message,
      audience,
      isPublished: true,
      publishedAt: new Date(`2026-0${Math.min(7, i + 1)}-${String(5 + i).padStart(2, "0")}T08:00:00.000Z`),
    });
  }

  await db.orm.public.AuditLog.create({
    schoolId: school.id,
    userId: owner.id,
    action: "CREATE",
    entity: "School",
    entityId: school.id,
    newValue: JSON.stringify({ name: school.name, demo: true }),
  });

  console.log("DEMO SCHOOL SEEDED");
  console.log(`School: ${school.name}`);
  console.log(`School ID: ${school.id}`);
  console.log(`Students: ${students.length}`);
  console.log(`Parents: ${parents.length}`);
  console.log(`Teachers: ${teacherRecords.length}`);
  console.log(`Classes: ${classes.length}`);
  console.log(`Subjects: ${subjectRecords.length}`);
  console.log(`Exams: ${exams.length}`);
  console.log("Demo password for seeded role accounts:", DEMO_PASSWORD);
  console.log("Portal accounts: student1 / parent1 / teacher1");
  console.log("Owner account: owner");
  console.log("Cashier account: cashier");

  await db.close();
}

main().catch(async (error) => {
  console.error("DEMO SEED FAILED");
  console.error(error);
  await db.close();
  process.exit(1);
});
