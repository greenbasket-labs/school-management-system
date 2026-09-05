import { requirePermission } from "../../src/lib/authorization";
import { hasPermission } from "../../src/lib/permissions";
import { getSchool } from "../../src/lib/school";
import { db } from "../../src/prisma/db";

export default async function UsersPage() {
  const user = await requirePermission("users.view");

  const canManageRoles = await hasPermission(
    user.id,
    "users.manage_roles",
  );

  const school = await getSchool();
  const users = await db.orm.public.User.all();

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ?? "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Users
            </h1>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Dashboard
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                User Management
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Manage administrators, teachers, cashiers, students, parents
                and other school staff.
              </p>
            </div>

            <a
              href="/users/new"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Add User
            </a>
          </div>

          <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-5 gap-4 bg-slate-50 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <div>Name</div>
                <div>Permanent ID</div>
                <div>User Type</div>
                <div>Status</div>
                <div>Action</div>
              </div>

              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-5 gap-4 border-t border-slate-100 px-5 py-5 text-sm text-slate-700"
                >
                  <div className="font-medium text-slate-900">
                    {user.name}
                  </div>

                  <div>{user.permanentId}</div>

                  <div>{user.userType}</div>

                  <div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      {user.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={`/users/${user.id}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      View
                    </a>

                    {canManageRoles && (
                      <a
                        href={`/users/${user.id}/roles`}
                        className="font-medium text-purple-600 hover:text-purple-700"
                      >
                        Manage Roles
                      </a>
                    )}
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-500">
                  No users found.
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-5">
            <p className="text-sm font-semibold text-blue-900">
              User workflow
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              New users will eventually follow the workflow:
              registration → pending approval → admin approval →
              permanent ID → active account.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}