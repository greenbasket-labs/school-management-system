import { redirect } from "next/navigation";
import { getCurrentUser } from "../../src/lib/current-user";
import { getSchool } from "../../src/lib/school";
import { db } from "../../src/prisma/db";
import { getPublishedAnnouncements } from "../../src/lib/announcements";
import { requirePortal } from "../../src/lib/portal-access";
import {
  AnnouncementsPanel,
  AttendancePanel,
  FinancePanel,
  PortalCard,
  PortalHeader,
  PortalNotLinked,
  PortalSection,
  ResultsPanel,
  WelcomeCard,
  calculateFinance,
  getPublishedStudentResults,
  getPublishedStudentResultsForSchool,
  getStudentFinance,
} from "./portal-helpers";

export default async function PortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.userType === "STUDENT") {
    await requirePortal("STUDENT");
  } else if (user.userType === "PARENT") {
    await requirePortal("PARENT");
  } else if (user.userType === "TEACHER") {
    await requirePortal("TEACHER");
  }

  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  const publishedAnnouncements = await getPublishedAnnouncements();

  const students = await db.orm.public.Student.all();
  const classes = await db.orm.public.SchoolClass.all();

  if (user.userType === "STUDENT") {
    const student = students.find(
      (item) =>
        item.userId === user.id &&
        item.schoolId === school.id,
    );

    if (!student) {
      return (
        <PortalNotLinked
          schoolName={school.name}
          userName={user.name}
          userType="Student"
        />
      );
    }

    const currentClass = classes.find(
      (item) =>
        item.id === student.currentClassId &&
        item.schoolId === school.id,
    );

    const attendanceRecords = await db.orm.public.AttendanceRecord.all();
    const studentAttendance = attendanceRecords.filter(
      (record) =>
        record.schoolId === school.id &&
        record.studentId === student.id,
    );

    const presentCount = studentAttendance.filter(
      (record) => String(record.status) === "PRESENT",
    ).length;
    const absentCount = studentAttendance.filter(
      (record) => String(record.status) === "ABSENT",
    ).length;
    const attendanceTotal = presentCount + absentCount;
    const attendanceRate =
      attendanceTotal > 0 ? (presentCount / attendanceTotal) * 100 : 0;

    const results = await getPublishedStudentResults(school.id, student.id);
    const fees = await getStudentFinance(school.id, student.id);
    const announcements = publishedAnnouncements.filter(
      (announcement) =>
        announcement.audience === "ALL" ||
        announcement.audience === "STUDENT",
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <PortalHeader schoolName={school.name} title="Student Portal" userName={user.name} />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <WelcomeCard
            name={`${student.firstName} ${student.lastName}`}
            permanentId={student.permanentId}
          />
          <div className="mt-6 grid gap-5 md:grid-cols-4">
            <PortalCard
              title="Current Class"
              value={
                currentClass
                  ? `${currentClass.name}${currentClass.section ? ` ${currentClass.section}` : ""}`
                  : "Not assigned"
              }
            />
            <PortalCard title="Attendance" value={`${attendanceRate.toFixed(1)}%`} />
            <PortalCard title="Fees Paid" value={`₦${fees.totalPaid.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <PortalCard title="Outstanding" value={`₦${fees.balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <AttendancePanel
              present={presentCount}
              absent={absentCount}
              total={attendanceTotal}
              rate={attendanceRate}
            />
            <FinancePanel
              totalDue={fees.totalDue}
              totalPaid={fees.totalPaid}
              balance={fees.balance}
            />
          </div>
          <div className="mt-6"><ResultsPanel results={results} /></div>
          <div className="mt-6"><AnnouncementsPanel announcements={announcements} /></div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <PortalSection
              title="Academic"
              items={[
                "Published results are shown above.",
                "Report cards remain available through the school's report-card workflow.",
              ]}
            />
            <PortalSection
              title="School"
              items={["Attendance summary is shown above.", `School: ${school.name}`]}
            />
          </div>
        </div>
      </main>
    );
  }

  if (user.userType === "PARENT") {
    const parents = await db.orm.public.Parent.all();
    const parent = parents.find(
      (item) => item.userId === user.id && item.schoolId === school.id,
    );

    if (!parent) {
      return (
        <PortalNotLinked schoolName={school.name} userName={user.name} userType="Parent" />
      );
    }

    const links = await db.orm.public.StudentParent.all();
    const children = links
      .filter((link) => link.parentId === parent.id)
      .map((link) => {
        const student = students.find(
          (item) => item.id === link.studentId && item.schoolId === school.id,
        );
        if (!student) return null;
        const currentClass = classes.find(
          (item) => item.id === student.currentClassId && item.schoolId === school.id,
        );
        return {
          student,
          currentClass,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const attendanceRecords = await db.orm.public.AttendanceRecord.all();
    const allResults = await getPublishedStudentResultsForSchool(school.id);
    const feeAssignments = await db.orm.public.FeeAssignment.all();
    const payments = await db.orm.public.Payment.all();

    const childData = children.map((child) => {
      const childAttendance = attendanceRecords.filter(
        (record) =>
          record.schoolId === school.id &&
          record.studentId === child.student.id,
      );
      const present = childAttendance.filter(
        (record) => String(record.status) === "PRESENT",
      ).length;
      const absent = childAttendance.filter(
        (record) => String(record.status) === "ABSENT",
      ).length;
      const totalAttendance = present + absent;
      const attendanceRate =
        totalAttendance > 0 ? (present / totalAttendance) * 100 : 0;
      const childFees = calculateFinance(
        feeAssignments.filter(
          (fee) =>
            fee.schoolId === school.id &&
            fee.studentId === child.student.id,
        ),
        payments.filter(
          (payment) =>
            payment.schoolId === school.id &&
            payment.studentId === child.student.id,
        ),
      );
      const childResults = allResults.filter(
        (result) => result.studentId === child.student.id,
      );
      return {
        ...child,
        attendance: { present, absent, total: totalAttendance, rate: attendanceRate },
        fees: childFees,
        results: childResults,
      };
    });

    const announcements = publishedAnnouncements.filter(
      (announcement) =>
        announcement.audience === "ALL" ||
        announcement.audience === "PARENT",
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <PortalHeader schoolName={school.name} title="Parent Portal" userName={user.name} />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <WelcomeCard
            name={`${parent.firstName} ${parent.lastName}`}
            permanentId={parent.permanentId}
          />
          <section className="mt-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">My Children</h3>
              <p className="mt-1 text-sm text-slate-500">
                Attendance, results and fee information for linked students.
              </p>
            </div>
            <div className="space-y-6">
              {childData.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                  No students are currently linked to this parent account.
                </div>
              ) : (
                childData.map((child) => (
                  <section
                    key={child.student.id}
                    className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {child.relationship}{child.isPrimary ? " • Primary Guardian" : ""}
                        </p>
                        <h4 className="mt-2 text-2xl font-bold text-slate-900">
                          {child.student.firstName} {child.student.lastName}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">{child.student.permanentId}</p>
                      </div>
                      <div className="text-sm text-slate-500">
                        Class: <span className="font-semibold text-slate-900">
                          {child.currentClass
                            ? `${child.currentClass.name}${child.currentClass.section ? ` ${child.currentClass.section}` : ""}`
                            : "Not assigned"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <PortalCard title="Attendance" value={`${child.attendance.rate.toFixed(1)}%`} />
                      <PortalCard title="Present" value={String(child.attendance.present)} />
                      <PortalCard title="Fees Paid" value={`₦${child.fees.totalPaid.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                      <PortalCard title="Outstanding" value={`₦${child.fees.balance.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                    </div>
                    <div className="mt-6"><ResultsPanel results={child.results} compact /></div>
                  </section>
                ))
              )}
            </div>
          </section>
          <div className="mt-6"><AnnouncementsPanel announcements={announcements} /></div>
          <div className="mt-6">
            <PortalSection
              title="School"
              items={["Fee information is shown on each child's dashboard.", `School: ${school.name}`]}
            />
          </div>
        </div>
      </main>
    );
  }

  if (user.userType === "TEACHER") {
    const teachers = await db.orm.public.Teacher.all();
    const teacher = teachers.find(
      (item) => item.userId === user.id && item.schoolId === school.id,
    );

    if (!teacher) {
      return (
        <PortalNotLinked schoolName={school.name} userName={user.name} userType="Teacher" />
      );
    }

    const classSubjects = await db.orm.public.ClassSubject.all();
    const teacherClasses = classes.filter(
      (schoolClass) =>
        schoolClass.schoolId === school.id &&
        schoolClass.classTeacherId === teacher.id,
    );
    const teacherClassSubjectIds = classSubjects.filter(
      (item) => item.teacherId === teacher.id,
    );
    const teacherClassIds = Array.from(
      new Set([
        ...teacherClasses.map((item) => item.id),
        ...teacherClassSubjectIds.map((item) => item.classId),
      ]),
    );
    const teacherSubjects = classSubjects.filter(
      (item) =>
        item.teacherId === teacher.id &&
        teacherClassIds.includes(item.classId),
    );
    const subjects = await db.orm.public.Subject.all();
    const announcements = publishedAnnouncements.filter(
      (announcement) =>
        announcement.audience === "ALL" ||
        announcement.audience === "TEACHER",
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <PortalHeader schoolName={school.name} title="Teacher Portal" userName={user.name} />
        <div className="mx-auto max-w-6xl px-6 py-8">
          <WelcomeCard
            name={`${teacher.firstName} ${teacher.lastName}`}
            permanentId={teacher.permanentId}
          />
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <PortalCard title="Teacher Status" value={String(teacher.status)} />
            <PortalCard title="Assigned Classes" value={String(teacherClassIds.length)} />
            <PortalCard title="Assigned Subjects" value={String(teacherSubjects.length)} />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Assigned Classes</h3>
              <div className="mt-4 space-y-3">
                {teacherClassIds.length === 0 ? (
                  <p className="text-sm text-slate-500">No classes assigned.</p>
                ) : (
                  teacherClassIds.map((classId) => {
                    const schoolClass = classes.find((item) => item.id === classId);
                    if (!schoolClass) return null;
                    return (
                      <div key={classId} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="font-semibold text-slate-900">
                          {schoolClass.name}{schoolClass.section ? ` ${schoolClass.section}` : ""}
                        </p>
                        {schoolClass.classTeacherId === teacher.id && (
                          <p className="mt-1 text-xs text-blue-600">Class Teacher</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Assigned Subjects</h3>
              <div className="mt-4 space-y-3">
                {teacherSubjects.length === 0 ? (
                  <p className="text-sm text-slate-500">No subjects assigned.</p>
                ) : (
                  teacherSubjects.map((assignment) => {
                    const schoolClass = classes.find((item) => item.id === assignment.classId);
                    const subject = subjects.find((item) => item.id === assignment.subjectId);
                    return (
                      <div key={assignment.id} className="rounded-xl bg-slate-50 px-4 py-3">
                        <p className="font-semibold text-slate-900">{subject?.name ?? "Subject"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {schoolClass?.name ?? "Class"}{schoolClass?.section ? ` ${schoolClass.section}` : ""}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <div className="mt-6"><AnnouncementsPanel announcements={announcements} /></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Portal unavailable</h1>
        <p className="mt-2 text-sm text-slate-500">
          This account does not have a supported school portal.
        </p>
      </div>
    </main>
  );
}
