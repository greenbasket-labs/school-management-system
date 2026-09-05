import { db } from "../src/prisma/db";

const permissions = [
  // User Management
  ["users.view", "View Users", "View user accounts"],
  ["users.create", "Create Users", "Create user accounts"],
  ["users.edit", "Edit Users", "Edit user accounts"],
  ["users.delete", "Delete Users", "Delete user accounts"],
  ["users.approve", "Approve Users", "Approve pending user accounts"],
  ["users.suspend", "Suspend Users", "Suspend user accounts"],
  ["users.manage_roles", "Manage User Roles", "Assign and remove user roles"],

  // School Setup
  ["school.view", "View School Setup", "View school configuration"],
  ["school.edit", "Edit School Setup", "Edit school configuration"],

  // Students
  ["students.view", "View Students", "View student records"],
  ["students.create", "Create Students", "Create student records"],
  ["students.edit", "Edit Students", "Edit student records"],
  ["students.delete", "Delete Students", "Delete student records"],
  [
    "students.promote",
    "Promote Students",
    "Promote students to another class/session",
  ],

  // Parents
  ["parents.view", "View Parents", "View parent records"],
  ["parents.create", "Create Parents", "Create parent records"],
  ["parents.edit", "Edit Parents", "Edit parent records"],
  ["parents.delete", "Delete Parents", "Delete parent records"],

  // Teachers
  ["teachers.view", "View Teachers", "View teacher and staff records"],
  ["teachers.create", "Create Teachers", "Create teacher records"],
  ["teachers.edit", "Edit Teachers", "Edit teacher records"],
  ["teachers.delete", "Delete Teachers", "Delete teacher records"],

  // Classes
  ["classes.view", "View Classes", "View classes"],
  ["classes.create", "Create Classes", "Create classes"],
  ["classes.edit", "Edit Classes", "Edit classes"],
  ["classes.delete", "Delete Classes", "Delete classes"],
  ["classes.assign_students", "Assign Students", "Assign students to classes"],
  ["classes.assign_subjects", "Assign Subjects", "Assign subjects to classes"],

  // Subjects
  ["subjects.view", "View Subjects", "View subjects"],
  ["subjects.create", "Create Subjects", "Create subjects"],
  ["subjects.edit", "Edit Subjects", "Edit subjects"],
  ["subjects.delete", "Delete Subjects", "Delete subjects"],
  [
    "subjects.assign_teachers",
    "Assign Teachers",
    "Assign teachers to subjects",
  ],

  // Academic Sessions
  ["academics.view", "View Academics", "View academic sessions and terms"],
  ["academics.create", "Create Academic Sessions", "Create academic sessions"],
  ["academics.edit", "Edit Academic Sessions", "Edit academic sessions"],
  ["academics.manage_terms", "Manage Terms", "Manage academic terms"],

  // Fees
  ["fees.view", "View Fees", "View fee records"],
  ["fees.create", "Create Fees", "Create fee definitions"],
  ["fees.edit", "Edit Fees", "Edit fee definitions"],
  ["fees.delete", "Delete Fees", "Delete fee definitions"],
  ["fees.assign", "Assign Fees", "Assign fees to students/classes"],

  // Payments
  ["payments.view", "View Payments", "View payment records"],
  ["payments.create", "Create Payments", "Record payments"],
  ["payments.edit", "Edit Payments", "Edit payment records"],
  ["payments.delete", "Delete Payments", "Delete payment records"],
  ["payments.refund", "Refund Payments", "Refund or reverse payments"],

  // Receipts
  ["receipts.view", "View Receipts", "View payment receipts"],
  ["receipts.create", "Create Receipts", "Create payment receipts"],

  // Attendance
  ["attendance.view", "View Attendance", "View attendance records"],
  ["attendance.mark", "Mark Attendance", "Record student attendance"],
  ["attendance.edit", "Edit Attendance", "Edit attendance records"],

  // Examinations
  ["exams.view", "View Exams", "View examinations"],
  ["exams.create", "Create Exams", "Create examinations"],
  ["exams.edit", "Edit Exams", "Edit examinations"],
  ["exams.delete", "Delete Exams", "Delete examinations"],
  ["exams.publish", "Publish Exams", "Publish examinations"],
  ["exams.close", "Close Exams", "Close examinations"],

  // Results
  ["results.view", "View Results", "View student results"],
  ["results.enter", "Enter Results", "Enter student results"],
  ["results.edit", "Edit Results", "Edit student results"],
  ["results.approve", "Approve Results", "Approve student results"],
  ["results.publish", "Publish Results", "Publish student results"],

  // Report Cards
  ["report_cards.view", "View Report Cards", "View report cards"],
  ["report_cards.generate", "Generate Report Cards", "Generate report cards"],

  // Reports
  ["reports.view", "View Reports", "View system reports"],
  ["reports.generate", "Generate Reports", "Generate system reports"],

  // Communication
  ["announcements.view", "View Announcements", "View announcements"],
  ["announcements.create", "Create Announcements", "Create announcements"],
  ["announcements.edit", "Edit Announcements", "Edit announcements"],
  ["announcements.delete", "Delete Announcements", "Delete announcements"],
  ["notifications.send", "Send Notifications", "Send school notifications"],

  // Audit
  ["audit.view", "View Audit Logs", "View system audit logs"],
] as const;

const roles = [
  {
    name: "Owner",
    description: "Full control of the school management system",
  },
  {
    name: "Administrator",
    description: "Manage school administration and operations",
  },
  {
    name: "Teacher",
    description: "Manage assigned academic and classroom responsibilities",
  },
  {
    name: "Cashier",
    description: "Manage school fees, payments and receipts",
  },
  {
    name: "Student",
    description:
      "Access the authenticated student's own school information",
  },
  {
    name: "Parent",
    description: "Access information belonging to linked children",
  },
  {
    name: "Staff",
    description:
      "Limited operational access based on assigned permissions",
  },
] as const;

const adminPermissions = new Set([
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "users.approve",
  "users.suspend",
  "users.manage_roles",

  "school.view",
  "school.edit",

  "students.view",
  "students.create",
  "students.edit",
  "students.delete",
  "students.promote",

  "parents.view",
  "parents.create",
  "parents.edit",
  "parents.delete",

  "teachers.view",
  "teachers.create",
  "teachers.edit",
  "teachers.delete",

  "classes.view",
  "classes.create",
  "classes.edit",
  "classes.delete",
  "classes.assign_students",
  "classes.assign_subjects",

  "subjects.view",
  "subjects.create",
  "subjects.edit",
  "subjects.delete",
  "subjects.assign_teachers",

  "academics.view",
  "academics.create",
  "academics.edit",
  "academics.manage_terms",

  "fees.view",
  "fees.create",
  "fees.edit",
  "fees.delete",
  "fees.assign",

  "payments.view",
  "payments.create",
  "payments.edit",
  "payments.delete",
  "payments.refund",

  "receipts.view",
  "receipts.create",

  "attendance.view",
  "attendance.mark",
  "attendance.edit",

  "exams.view",
  "exams.create",
  "exams.edit",
  "exams.delete",
  "exams.publish",
  "exams.close",

  "results.view",
  "results.enter",
  "results.edit",
  "results.approve",
  "results.publish",

  "report_cards.view",
  "report_cards.generate",

  "reports.view",
  "reports.generate",

  "announcements.view",
  "announcements.create",
  "announcements.edit",
  "announcements.delete",
  "notifications.send",

  "audit.view",
]);

const teacherPermissions = new Set([
  "students.view",
  "parents.view",
  "teachers.view",

  "classes.view",
  "subjects.view",

  "academics.view",

  "attendance.view",
  "attendance.mark",
  "attendance.edit",

  "exams.view",

  "results.view",
  "results.enter",
  "results.edit",

  "report_cards.view",

  "reports.view",

  "announcements.view",
  "announcements.create",
]);

const cashierPermissions = new Set([
  "fees.view",

  "payments.view",
  "payments.create",
  "payments.edit",

  "receipts.view",
  "receipts.create",

  "reports.view",
]);

const studentPermissions = new Set([
  "students.view",
  "classes.view",
  "subjects.view",
  "academics.view",
  "attendance.view",
  "fees.view",
  "payments.view",
  "receipts.view",
  "exams.view",
  "results.view",
  "report_cards.view",
  "announcements.view",
]);

const parentPermissions = new Set([
  "parents.view",
  "students.view",
  "classes.view",
  "subjects.view",
  "academics.view",
  "attendance.view",
  "fees.view",
  "payments.view",
  "receipts.view",
  "exams.view",
  "results.view",
  "report_cards.view",
  "announcements.view",
]);

const staffPermissions = new Set([
  "students.view",
  "parents.view",
  "teachers.view",
  "classes.view",
  "subjects.view",
  "academics.view",
  "attendance.view",
  "exams.view",
  "results.view",
  "reports.view",
  "announcements.view",
]);

const rolePermissionSets: Record<string, Set<string>> = {
  Owner: new Set(permissions.map(([code]) => code)),
  Administrator: adminPermissions,
  Teacher: teacherPermissions,
  Cashier: cashierPermissions,
  Student: studentPermissions,
  Parent: parentPermissions,
  Staff: staffPermissions,
};

async function main() {
  console.log("Starting RBAC seed...");

  const permissionMap = new Map<string, number>();

  for (const [code, name, description] of permissions) {
    const existing = (await db.orm.public.Permission.all()).find(
      (permission) => permission.code === code,
    );

    if (existing) {
      permissionMap.set(code, existing.id);

      await db.orm.public.Permission.where({
        id: existing.id,
      }).update({
        name,
        description,
      });

      continue;
    }

    const created = await db.orm.public.Permission.create({
      code,
      name,
      description,
    });

    permissionMap.set(code, created.id);
  }

  const roleMap = new Map<string, number>();

  for (const roleDefinition of roles) {
    const existing = (await db.orm.public.Role.all()).find(
      (role) => role.name === roleDefinition.name,
    );

    if (existing) {
      roleMap.set(roleDefinition.name, existing.id);

      await db.orm.public.Role.where({
        id: existing.id,
      }).update({
        description: roleDefinition.description,
        isSystem: true,
      });

      continue;
    }

    const created = await db.orm.public.Role.create({
      name: roleDefinition.name,
      description: roleDefinition.description,
      isSystem: true,
    });

    roleMap.set(roleDefinition.name, created.id);
  }

  for (const roleDefinition of roles) {
    const roleId = roleMap.get(roleDefinition.name);

    if (!roleId) {
      throw new Error(
        `Role ID not found: ${roleDefinition.name}`,
      );
    }

    const permissionCodes =
      rolePermissionSets[roleDefinition.name];

    if (!permissionCodes) {
      throw new Error(
        `Permission set not found: ${roleDefinition.name}`,
      );
    }

    for (const code of permissionCodes) {
      const permissionId = permissionMap.get(code);

      if (!permissionId) {
        throw new Error(
          `Permission ID not found: ${code}`,
        );
      }

      const existingAssignments =
        await db.orm.public.RolePermission.all();

      const alreadyAssigned =
        existingAssignments.find(
          (assignment) =>
            assignment.roleId === roleId &&
            assignment.permissionId === permissionId,
        );

      if (!alreadyAssigned) {
        await db.orm.public.RolePermission.create({
          roleId,
          permissionId,
        });
      }
    }
  }

  console.log("RBAC SEED COMPLETE");
  console.log(
    `Permissions: ${permissionMap.size}`,
  );
  console.log(
    `System Roles: ${roleMap.size}`,
  );

  await db.close();
}

main().catch(async (error) => {
  console.error("RBAC SEED FAILED");
  console.error(error);

  await db.close();
  process.exit(1);
});