import { redirect } from "next/navigation";
import { getCurrentUser } from "../../src/lib/current-user";
import { hasPermission } from "../../src/lib/permissions";
import { getRoles } from "../../src/lib/roles";

export default async function RolesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    user.id,
    "users.manage_roles",
  );

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              Access Denied
            </h1>

            <p className="mt-2 text-slate-500">
              You do not have permission to manage user roles.
            </p>

            <a
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </main>
    );
  }

  const roles = await getRoles();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Role Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Roles
            </h1>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            System Roles
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage the roles available in the school management system.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {role.name}
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Role ID: {role.id}
                  </p>
                </div>

                {role.isSystem && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    System
                  </span>
                )}
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-500">
                {role.description ??
                  "No description available."}
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <a
                  href={`/roles/${role.id}`}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  View permissions →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}