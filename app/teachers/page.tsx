import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getTeachers } from "../../src/lib/teachers";

const formatStatus = (status: string) =>
  status === "ACTIVE" ? "Active" : "Inactive";

export default async function TeachersPage() {
  const user = await requirePermission("teachers.view");
  const school = await getSchool();

  const teachers = await getTeachers(user.schoolId);

  let canCreate = false;

  try {
    await requirePermission("teachers.create");
    canCreate = true;
  } catch {
    canCreate = false;
  }

  const activeTeachers = teachers.filter(
    (teacher) => teacher.status === "ACTIVE",
  );

  const inactiveTeachers = teachers.filter(
    (teacher) => teacher.status !== "ACTIVE",
  );

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/dashboard"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Back to Dashboard
            </Link>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Teachers
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Manage teachers and teaching staff for {school?.name}.
            </p>
          </div>

          {canCreate && (
            <Link
              href="/teachers/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + Add Teacher
            </Link>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Teachers
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {teachers.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Active
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {activeTeachers.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Inactive
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-600">
              {inactiveTeachers.length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">
              Teacher Directory
            </h2>
          </div>

          {teachers.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-slate-600">
                No teachers have been added yet.
              </p>

              {canCreate && (
                <Link
                  href="/teachers/new"
                  className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline"
                >
                  Add the first teacher
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">
                      Permanent ID
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Teacher
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Phone
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Email
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Status
                    </th>

                    <th className="px-5 py-3 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {teachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-slate-700">
                        {teacher.permanentId}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {[
                            teacher.firstName,
                            teacher.middleName,
                            teacher.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {teacher.phone || "—"}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {teacher.email || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={
                            teacher.status === "ACTIVE"
                              ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                          }
                        >
                          {formatStatus(teacher.status)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/teachers/${teacher.id}`}
                          className="font-semibold text-blue-600 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}