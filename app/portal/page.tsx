import { redirect } from "next/navigation";
import { getCurrentUser } from "../../src/lib/current-user";
import { getSchool } from "../../src/lib/school";
import { db } from "../../src/prisma/db";
import { getPublishedAnnouncements } from "../../src/lib/announcements";

export default async function PortalPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  const publishedAnnouncements = await getPublishedAnnouncements();

  const students = await db.orm.public.Student.all();
  const classes = await db.orm.public.SchoolClass.all();

  /*
   * ------------------------------------------------------------
   * STUDENT PORTAL
   * ------------------------------------------------------------
   */
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

    const attendanceRecords =
      await db.orm.public.AttendanceRecord.all();

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
      attendanceTotal > 0
        ? (presentCount / attendanceTotal) * 100
        : 0;

    const results = await getPublishedStudentResults(
      school.id,
      student.id,
    );

    const fees = await getStudentFinance(
      school.id,
      student.id,
    );

    const announcements = publishedAnnouncements.filter(
      (announcement) =>
        announcement.audience === "ALL" ||
        announcement.audience === "STUDENT",
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <PortalHeader
          schoolName={school.name}
          title="Student Portal"
          userName={user.name}
        />

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
                  ? `${currentClass.name}${
                      currentClass.section
                        ? ` ${currentClass.section}`
                        : ""
                    }`
                  : "Not assigned"
              }
            />

            <PortalCard
              title="Attendance"
              value={`${attendanceRate.toFixed(1)}%`}
            />

            <PortalCard
              title="Fees Paid"
              value={formatMoney(fees.totalPaid)}
            />

            <PortalCard
              title="Outstanding"
              value={formatMoney(fees.balance)}
            />
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

          <div className="mt-6">
            <ResultsPanel results={results} />
          </div>

          <div className="mt-6">
            <AnnouncementsPanel announcements={announcements} />
          </div>

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
              items={[
                "Attendance summary is shown above.",
                `School: ${school.name}`,
              ]}
            />
          </div>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * PARENT PORTAL
   * ------------------------------------------------------------
   */
  if (user.userType === "PARENT") {
    const parents = await db.orm.public.Parent.all();

    const parent = parents.find(
      (item) =>
        item.userId === user.id &&
        item.schoolId === school.id,
    );

    if (!parent) {
      return (
        <PortalNotLinked
          schoolName={school.name}
          userName={user.name}
          userType="Parent"
        />
      );
    }

    const links = await db.orm.public.StudentParent.all();

    const children = links
      .filter((link) => link.parentId === parent.id)
      .map((link) => {
        const student = students.find(
          (item) =>
            item.id === link.studentId &&
            item.schoolId === school.id,
        );

        if (!student) {
          return null;
        }

        const currentClass = classes.find(
          (item) =>
            item.id === student.currentClassId &&
            item.schoolId === school.id,
        );

        return {
          student,
          currentClass,
          relationship: link.relationship,
          isPrimary: link.isPrimary,
        };
      })
      .filter(
        (
          item,
        ): item is NonNullable<typeof item> =>
          item !== null,
      );

    const attendanceRecords =
      await db.orm.public.AttendanceRecord.all();

    const allResults = await getPublishedStudentResultsForSchool(
      school.id,
    );

    const feeAssignments =
      await db.orm.public.FeeAssignment.all();

    const payments =
      await db.orm.public.Payment.all();

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
        totalAttendance > 0
          ? (present / totalAttendance) * 100
          : 0;

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
        attendance: {
          present,
          absent,
          total: totalAttendance,
          rate: attendanceRate,
        },
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
        <PortalHeader
          schoolName={school.name}
          title="Parent Portal"
          userName={user.name}
        />

        <div className="mx-auto max-w-6xl px-6 py-8">
          <WelcomeCard
            name={`${parent.firstName} ${parent.lastName}`}
            permanentId={parent.permanentId}
          />

          <section className="mt-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                My Children
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Attendance, results and fee information for
                linked students.
              </p>
            </div>

            <div className="space-y-6">
              {childData.length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                  No students are currently linked to this
                  parent account.
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
                          {child.relationship}
                          {child.isPrimary
                            ? " • Primary Guardian"
                            : ""}
                        </p>

                        <h4 className="mt-2 text-2xl font-bold text-slate-900">
                          {child.student.firstName}{" "}
                          {child.student.lastName}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          {child.student.permanentId}
                        </p>
                      </div>

                      <div className="text-sm text-slate-500">
                        Class:{" "}
                        <span className="font-semibold text-slate-900">
                          {child.currentClass
                            ? `${child.currentClass.name}${
                                child.currentClass.section
                                  ? ` ${child.currentClass.section}`
                                  : ""
                              }`
                            : "Not assigned"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                      <PortalCard
                        title="Attendance"
                        value={`${child.attendance.rate.toFixed(
                          1,
                        )}%`}
                      />

                      <PortalCard
                        title="Present"
                        value={String(
                          child.attendance.present,
                        )}
                      />

                      <PortalCard
                        title="Fees Paid"
                        value={formatMoney(
                          child.fees.totalPaid,
                        )}
                      />

                      <PortalCard
                        title="Outstanding"
                        value={formatMoney(
                          child.fees.balance,
                        )}
                      />
                    </div>

                    <div className="mt-6">
                      <ResultsPanel
                        results={child.results}
                        compact
                      />
                    </div>
                  </section>
                ))
              )}
            </div>
          </section>

          <div className="mt-6">
            <AnnouncementsPanel announcements={announcements} />
          </div>

          <div className="mt-6">
            <PortalSection
              title="School"
              items={[
                "Fee information is shown on each child's dashboard.",
                `School: ${school.name}`,
              ]}
            />
          </div>
        </div>
      </main>
    );
  }

  /*
   * ------------------------------------------------------------
   * TEACHER PORTAL
   * ------------------------------------------------------------
   */
  if (user.userType === "TEACHER") {
    const teachers = await db.orm.public.Teacher.all();

    const teacher = teachers.find(
      (item) =>
        item.userId === user.id &&
        item.schoolId === school.id,
    );

    if (!teacher) {
      return (
        <PortalNotLinked
          schoolName={school.name}
          userName={user.name}
          userType="Teacher"
        />
      );
    }

    const classSubjects =
      await db.orm.public.ClassSubject.all();

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
        ...teacherClassSubjectIds.map(
          (item) => item.classId,
        ),
      ]),
    );

    const teacherSubjects = classSubjects.filter(
      (item) =>
        item.teacherId === teacher.id &&
        teacherClassIds.includes(item.classId),
    );

    const subjects =
      await db.orm.public.Subject.all();

    const announcements = publishedAnnouncements.filter(
      (announcement) =>
        announcement.audience === "ALL" ||
        announcement.audience === "TEACHER",
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <PortalHeader
          schoolName={school.name}
          title="Teacher Portal"
          userName={user.name}
        />

        <div className="mx-auto max-w-6xl px-6 py-8">
          <WelcomeCard
            name={`${teacher.firstName} ${teacher.lastName}`}
            permanentId={teacher.permanentId}
          />

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <PortalCard
              title="Teacher Status"
              value={String(teacher.status)}
            />

            <PortalCard
              title="Assigned Classes"
              value={String(teacherClassIds.length)}
            />

            <PortalCard
              title="Assigned Subjects"
              value={String(teacherSubjects.length)}
            />
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Assigned Classes
              </h3>

              <div className="mt-4 space-y-3">
                {teacherClassIds.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No classes assigned.
                  </p>
                ) : (
                  teacherClassIds.map((classId) => {
                    const schoolClass = classes.find(
                      (item) => item.id === classId,
                    );

                    if (!schoolClass) return null;

                    return (
                      <div
                        key={classId}
                        className="rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <p className="font-semibold text-slate-900">
                          {schoolClass.name}
                          {schoolClass.section
                            ? ` ${schoolClass.section}`
                            : ""}
                        </p>

                        {schoolClass.classTeacherId ===
                          teacher.id && (
                          <p className="mt-1 text-xs text-blue-600">
                            Class Teacher
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-bold text-slate-900">
                Assigned Subjects
              </h3>

              <div className="mt-4 space-y-3">
                {teacherSubjects.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No subjects assigned.
                  </p>
                ) : (
                  teacherSubjects.map((assignment) => {
                    const subject = subjects.find(
                      (item) =>
                        item.id === assignment.subjectId,
                    );

                    const schoolClass = classes.find(
                      (item) =>
                        item.id === assignment.classId,
                    );

                    if (!subject) return null;

                    return (
                      <div
                        key={assignment.id}
                        className="rounded-xl bg-slate-50 px-4 py-3"
                      >
                        <p className="font-semibold text-slate-900">
                          {subject.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {schoolClass
                            ? `${schoolClass.name}${
                                schoolClass.section
                                  ? ` ${schoolClass.section}`
                                  : ""
                              }`
                            : "Class not found"}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <AnnouncementsPanel announcements={announcements} />
          </div>

          <div className="mt-6">
            <PortalSection
              title="Teacher Access"
              items={[
                "Assigned classes are shown above.",
                "Assigned subjects are shown above.",
                "Attendance and result-entry workflows remain available through their respective school modules.",
              ]}
            />
          </div>
        </div>
      </main>
    );
  }

  redirect("/dashboard");
}

/*
 * ============================================================
 * DATA HELPERS
 * ============================================================
 */

async function getPublishedStudentResults(
  schoolId: number,
  studentId: number,
) {
  const results =
    await getPublishedStudentResultsForSchool(schoolId);

  return results.filter(
    (result) => result.studentId === studentId,
  );
}

async function getPublishedStudentResultsForSchool(
  schoolId: number,
) {
  const results = await db.orm.public.Result.all();
  const examSubjects =
    await db.orm.public.ExamSubject.all();
  const exams = await db.orm.public.Exam.all();
  const subjects =
    await db.orm.public.Subject.all();

  const published = results.filter(
    (result) =>
      result.schoolId === schoolId &&
      String(result.status) === "PUBLISHED",
  );

  return published
    .map((result) => {
      const examSubject = examSubjects.find(
        (item) => item.id === result.examSubjectId,
      );

      if (!examSubject) return null;

      const exam = exams.find(
        (item) =>
          item.id === examSubject.examId &&
          item.schoolId === schoolId,
      );

      if (!exam) return null;

      const subject = subjects.find(
        (item) => item.id === examSubject.subjectId,
      );

      return {
        id: result.id,
        studentId: result.studentId,
        examName: exam.name,
        examId: exam.id,
        subjectName:
          subject?.name ?? "Unknown Subject",
        subjectCode: subject?.code ?? "",
        totalMark: Number(result.totalMark),
        maxMark: Number(examSubject.maxMark),
        grade: result.grade ?? "—",
        position:
          result.position !== null &&
          result.position !== undefined
            ? String(result.position)
            : "—",
      };
    })
    .filter(
      (
        item,
      ): item is NonNullable<typeof item> =>
        item !== null,
    )
    .sort((a, b) => b.examId - a.examId);
}

async function getStudentFinance(
  schoolId: number,
  studentId: number,
) {
  const feeAssignments =
    await db.orm.public.FeeAssignment.all();

  const payments =
    await db.orm.public.Payment.all();

  return calculateFinance(
    feeAssignments.filter(
      (fee) =>
        fee.schoolId === schoolId &&
        fee.studentId === studentId,
    ),
    payments.filter(
      (payment) =>
        payment.schoolId === schoolId &&
        payment.studentId === studentId,
    ),
  );
}

function calculateFinance(
  feeAssignments: Array<{
    amount: unknown;
  }>,
  payments: Array<{
    amount: unknown;
  }>,
) {
  const totalDue = feeAssignments.reduce(
    (sum, fee) => sum + Number(fee.amount),
    0,
  );

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  const balance = Math.max(
    totalDue - totalPaid,
    0,
  );

  return {
    totalDue,
    totalPaid,
    balance,
  };
}

/*
 * ============================================================
 * UI
 * ============================================================
 */

function WelcomeCard({
  name,
  permanentId,
}: {
  name: string;
  permanentId: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-500">
        Welcome
      </p>

      <h2 className="mt-1 text-3xl font-bold text-slate-900">
        {name}
      </h2>

      <p className="mt-2 text-sm text-slate-500">
        {permanentId}
      </p>
    </div>
  );
}

function AttendancePanel({
  present,
  absent,
  total,
  rate,
}: {
  present: number;
  absent: number;
  total: number;
  rate: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-lg font-bold text-slate-900">
        Attendance
      </h3>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniStat
          label="Present"
          value={String(present)}
        />

        <MiniStat
          label="Absent"
          value={String(absent)}
        />

        <MiniStat
          label="Total"
          value={String(total)}
        />
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500">
            Attendance rate
          </span>

          <span className="font-bold text-slate-900">
            {rate.toFixed(1)}%
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{
              width: `${Math.min(rate, 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function FinancePanel({
  totalDue,
  totalPaid,
  balance,
}: {
  totalDue: number;
  totalPaid: number;
  balance: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-lg font-bold text-slate-900">
        Fees
      </h3>

      <div className="mt-5 space-y-3">
        <FinanceRow
          label="Total Due"
          value={formatMoney(totalDue)}
        />

        <FinanceRow
          label="Total Paid"
          value={formatMoney(totalPaid)}
        />

        <div className="border-t border-slate-100 pt-3">
          <FinanceRow
            label="Outstanding Balance"
            value={formatMoney(balance)}
            strong
          />
        </div>
      </div>
    </div>
  );
}

function ResultsPanel({
  results,
  compact = false,
}: {
  results: Array<{
    id: number;
    studentId: number;
    examName: string;
    examId: number;
    subjectName: string;
    subjectCode: string;
    totalMark: number;
    maxMark: number;
    grade: string;
    position: string;
  }>;
  compact?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Published Results
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Only published results are visible here.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {results.length} result
          {results.length === 1 ? "" : "s"}
        </span>
      </div>

      {results.length === 0 ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
          No published results are available yet.
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                <th className="px-3 py-3">
                  Exam
                </th>

                <th className="px-3 py-3">
                  Subject
                </th>

                <th className="px-3 py-3">
                  Mark
                </th>

                <th className="px-3 py-3">
                  Grade
                </th>

                <th className="px-3 py-3">
                  Position
                </th>
              </tr>
            </thead>

            <tbody>
              {results
                .slice(
                  0,
                  compact ? 5 : results.length,
                )
                .map((result) => (
                  <tr
                    key={result.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-4 font-medium text-slate-900">
                      {result.examName}
                    </td>

                    <td className="px-3 py-4 text-slate-600">
                      {result.subjectName}
                      {result.subjectCode
                        ? ` (${result.subjectCode})`
                        : ""}
                    </td>

                    <td className="px-3 py-4 font-semibold text-slate-900">
                      {result.totalMark.toFixed(2)}
                      {" / "}
                      {result.maxMark}
                    </td>

                    <td className="px-3 py-4 text-slate-600">
                      {result.grade}
                    </td>

                    <td className="px-3 py-4 text-slate-600">
                      {result.position}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PortalHeader({
  schoolName,
  title,
  userName,
}: {
  schoolName: string;
  title: string;
  userName: string;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            {schoolName}
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:inline">
            {userName}
          </span>

          <a
            href="/logout"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </a>
        </div>
      </div>
    </header>
  );
}

function PortalCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function FinanceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "font-semibold text-slate-900"
            : "text-sm text-slate-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-lg font-bold text-slate-900"
            : "font-semibold text-slate-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function AnnouncementsPanel({
  announcements,
}: {
  announcements: Array<{
    id: number;
    title: string;
    message: string;
    audience: string;
    isPublished: boolean;
    publishedAt: unknown;
    createdAt: unknown;
  }>;
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            School Announcements
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Important updates from the school.
          </p>
        </div>

        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          {announcements.length} announcement
          {announcements.length === 1 ? "" : "s"}
        </span>
      </div>

      {announcements.length === 0 ? (
        <div className="mt-5 rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
          No published announcements are available.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {announcements.map((announcement) => (
            <article
              key={announcement.id}
              className="rounded-xl border border-slate-200 p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h4 className="font-bold text-slate-900">
                  {announcement.title}
                </h4>

                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {announcement.audience === "ALL"
                    ? "Everyone"
                    : announcement.audience}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {announcement.message}
              </p>

              {announcement.publishedAt != null && (
                <p className="mt-4 text-xs text-slate-400">
                  Published {formatPortalDate(announcement.publishedAt)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function PortalSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h3 className="text-lg font-bold text-slate-900">
        {title}
      </h3>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div
            key={item}
            className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function PortalNotLinked({
  schoolName,
  userName,
  userType,
}: {
  schoolName: string;
  userName: string;
  userType: string;
}) {
  return (
    <main className="min-h-screen bg-slate-50">
      <PortalHeader
        schoolName={schoolName}
        title={`${userType} Portal`}
        userName={userName}
      />

      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">
            Portal Account Not Linked
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Your login account has not yet been linked
            to your school
            {userType === "Student"
              ? " student"
              : userType === "Parent"
                ? " parent"
                : " teacher"}{" "}
            record.
          </p>

          <p className="mt-4 text-sm text-slate-500">
            Please contact the school administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

function formatPortalDate(value: unknown) {
  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
