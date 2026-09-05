import { requirePermission } from "../../src/lib/authorization";
import { getSchool } from "../../src/lib/school";
import { getStudents } from "../../src/lib/students";

export default async function StudentsPage() {
  await requirePermission("students.view");

  const school = await getSchool();
  const students = await getStudents();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ?? "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Students
            </h1>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Dashboard
            </a>

            <a
              href="/students/new"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add Student
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Student Records
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Manage student profiles, permanent IDs, classes and
                academic history.
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Total Students
              </p>

              <p className="mt-1 text-2xl font-bold text-blue-900">
                {students.length}
              </p>
            </div>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
            <div className="min-w-[950px]">
              <div className="grid grid-cols-7 gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div>Permanent ID</div>
                <div>Name</div>
                <div>Gender</div>
                <div>Phone</div>
                <div>Status</div>
                <div>Class</div>
                <div>Action</div>
              </div>

              {students.map((student) => (
                <div
                  key={student.id}
                  className="grid grid-cols-7 gap-4 border-t border-slate-100 px-5 py-5 text-sm text-slate-700"
                >
                  <div className="font-medium text-blue-600">
                    {student.permanentId}
                  </div>

                  <div className="font-medium text-slate-900">
                    {[
                      student.firstName,
                      student.middleName,
                      student.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  </div>

                  <div>
                    {student.gender ?? "—"}
                  </div>

                  <div>
                    {student.phone ?? "—"}
                  </div>

                  <div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {student.status}
                    </span>
                  </div>

                  <div>
                    {student.currentClassId
                      ? `Class #${student.currentClassId}`
                      : "Not assigned"}
                  </div>

                  <div>
                    <a
                      href={`/students/${student.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}

              {students.length === 0 && (
                <div className="border-t border-slate-100 px-5 py-12 text-center">
                  <p className="font-medium text-slate-700">
                    No students registered yet.
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Start by registering the first student.
                  </p>

                  <a
                    href="/students/new"
                    className="mt-5 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Register Student
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}