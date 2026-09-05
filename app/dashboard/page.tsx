import { redirect } from "next/navigation";
import { getCurrentUser } from "../../src/lib/current-user";
import { getSchool } from "../../src/lib/school";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const school = await getSchool();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ?? "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              School Dashboard
            </h1>
          </div>

          <a
            href="/login"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Sign out
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Welcome, {user.name}
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {school?.name ?? "Your School"}
          </h2>

          <p className="mt-3 text-slate-500">
            Manage students, teachers, academics, fees, attendance,
            examinations and school operations from one place.
          </p>
        </div>

        <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Students", "Registration, profiles and student records"],
            ["Teachers", "Teacher profiles, classes and subjects"],
            ["Academics", "Sessions, terms, classes and subjects"],
            ["Finance", "Fees, payments, balances and receipts"],
            ["Attendance", "Daily attendance and attendance records"],
            ["Exams & Results", "Scores, grading, positions and report cards"],
          ].map(([title, description]) => (
            <div
              key={title}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <h3 className="font-semibold text-slate-900">
                {title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {description}
              </p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}