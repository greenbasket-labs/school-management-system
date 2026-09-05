import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { getParentById } from "../../../src/lib/parents";
import { db } from "../../../src/prisma/db";

function formatDate(value: unknown): string {
  if (!value) {
    return "—";
  }

  const dateText = String(value);
  const datePart = dateText.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const monthNumber = Number(month);

    if (monthNumber >= 1 && monthNumber <= 12) {
      return `${day} ${monthNames[monthNumber - 1]} ${year}`;
    }
  }

  return dateText;
}

export default async function ParentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requirePermission("parents.view");
  const school = await getSchool();

  const { id } = await params;
  const parentId = Number(id);

  if (!Number.isInteger(parentId)) {
    notFound();
  }

  const parent = await getParentById(
    parentId,
    actor.schoolId,
  );

  if (!parent) {
    notFound();
  }

  const studentParents =
    await db.orm.public.StudentParent.all();

  const students =
    await db.orm.public.Student.all();

  const linkedStudentIds = studentParents
    .filter(
      (item) =>
        item.parentId === parent.id,
    )
    .map((item) => item.studentId);

  const linkedStudents = students.filter(
    (student) =>
      student.schoolId === actor.schoolId &&
      linkedStudentIds.includes(student.id),
  );

  let canEdit = false;

  try {
    await requirePermission("parents.edit");
    canEdit = true;
  } catch {
    canEdit = false;
  }

  const fullName = [
    parent.firstName,
    parent.middleName,
    parent.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/parents"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              ← Back to Parents
            </Link>

            <div className="mt-4">
              <p className="text-sm font-medium text-slate-500">
                {school.name}
              </p>

              <h1 className="text-3xl font-bold text-slate-900">
                Parent / Guardian Profile
              </h1>
            </div>
          </div>

          {canEdit ? (
            <Link
              href={`/parents/${parent.id}/edit`}
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Edit Parent
            </Link>
          ) : null}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">
                {parent.permanentId}
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {fullName}
              </h2>
            </div>

            <span
              className={
                parent.status === "ACTIVE"
                  ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
              }
            >
              {parent.status}
            </span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Personal Information
            </h2>

            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Permanent ID
                </dt>
                <dd className="mt-1 text-sm font-medium text-slate-900">
                  {parent.permanentId}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Full Name
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {fullName}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Phone
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {parent.phone ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Email
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {parent.email ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Address
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {parent.address ?? "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {parent.status}
                </dd>
              </div>

              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
                </dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {formatDate(parent.createdAt)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Linked Students
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Students connected to this parent or guardian.
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                {linkedStudents.length}
              </span>
            </div>

            <div className="mt-5">
              {linkedStudents.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="font-medium text-slate-900">
                    No students linked yet.
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Student linking will be added to the parent
                    management workflow.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {linkedStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between gap-4 p-4"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {[
                            student.firstName,
                            student.middleName,
                            student.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {student.permanentId}
                        </p>
                      </div>

                      <Link
                        href={`/students/${student.id}`}
                        className="text-sm font-semibold text-slate-900 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Parent / Guardian Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Student linking and portal account management will be
            connected as the parent module is completed.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Students
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Link one or more students to this parent.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                Portal Account
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Parent portal access will be connected later.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}