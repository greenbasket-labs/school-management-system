const stats = [
  { label: "Students", value: "0", detail: "Registered students" },
  { label: "Teachers", value: "0", detail: "Active teachers" },
  { label: "Classes", value: "0", detail: "Configured classes" },
  { label: "Outstanding Fees", value: "₦0", detail: "Current balance" },
];

const modules = [
  {
    title: "Students",
    description: "Register students, manage profiles, IDs, classes and school history.",
  },
  {
    title: "Academics",
    description: "Manage sessions, terms, classes, subjects, exams and results.",
  },
  {
    title: "Finance",
    description: "Track fees, payments, balances, receipts and cashier activity.",
  },
  {
    title: "Attendance",
    description: "Record attendance and monitor student attendance performance.",
  },
  {
    title: "Reports",
    description: "Access academic, financial, attendance and administrative reports.",
  },
  {
    title: "Communication",
    description: "Manage announcements and school notifications.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
              School Management System
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              School Administration
            </h1>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50">
              Settings
            </button>
            <button className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700">
              Sign In
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="rounded-2xl bg-slate-900 px-6 py-8 text-white shadow-sm sm:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-emerald-300">
              Welcome
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Run your school from one place.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-300">
              Manage students, teachers, classes, fees, attendance, exams,
              results, reports and communication through one connected system.
            </p>
          </div>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-slate-400">{stat.detail}</p>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-600">
                Core modules
              </p>
              <h3 className="mt-1 text-2xl font-bold tracking-tight">
                Everything your school needs
              </h3>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((module) => (
              <div
                key={module.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-sm font-bold text-emerald-700">
                  {module.title.charAt(0)}
                </div>

                <h4 className="mt-5 text-lg font-semibold">{module.title}</h4>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {module.description}
                </p>

                <button className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800">
                  Open module →
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
