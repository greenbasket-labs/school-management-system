import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../src/lib/current-user";
import { hasPermission } from "../../../src/lib/permissions";
import { getSchool } from "../../../src/lib/school";
import { getUserRolesById } from "../../../src/lib/roles";
import { db } from "../../../src/prisma/db";

type UserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserProfilePage({
  params,
}: UserPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.view",
  );

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              Access Denied
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              You do not have permission to view user profiles.
            </p>

            <a
              href="/users"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Users
            </a>
          </div>
        </div>
      </main>
    );
  }

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              User not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              The requested user does not exist.
            </p>

            <a
              href="/users"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Users
            </a>
          </div>
        </div>
      </main>
    );
  }

  const school = await getSchool();
  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      (!school || item.schoolId === school.id),
  );

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                {school?.name ?? "School Management System"}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                User Profile
              </h1>
            </div>

            <a
              href="/users"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Users
            </a>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              User not found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              The requested user does not exist.
            </p>

            <a
              href="/users"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Back to Users
            </a>
          </div>
        </div>
      </main>
    );
  }

  const userRoles = await getUserRolesById(user.id);

  const canEdit = await hasPermission(
    currentUser.id,
    "users.edit",
  );

  const canManageRoles = await hasPermission(
    currentUser.id,
    "users.manage_roles",
  );

  const canManagePortal =
    canEdit &&
    (user.userType === "STUDENT" ||
      user.userType === "PARENT" ||
      user.userType === "TEACHER");

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ?? "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              User Profile
            </h1>
          </div>

          <a
            href="/users"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Users
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col justify-between gap-5 border-b border-slate-100 pb-8 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {user.userType}
              </p>

              <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {user.name}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {user.permanentId}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-green-100 px-4 py-2 text-xs font-semibold text-green-700">
              {user.status}
            </span>
          </div>

          <section className="mt-8">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Account Information
            </h3>

            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Full Name
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.name}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Permanent ID
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.permanentId}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  User Type
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.userType}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.status}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Username
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.username ?? "Not provided"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.email ?? "Not provided"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Phone
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.phone ?? "Not provided"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  User ID
                </p>

                <p className="mt-2 font-medium text-slate-900">
                  {user.id}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Assigned Roles
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Roles assigned to this user.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {userRoles.length} role
                {userRoles.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {userRoles.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-5 md:col-span-2">
                  <p className="text-sm text-slate-500">
                    No roles are currently assigned to this user.
                  </p>
                </div>
              ) : (
                userRoles.map((role) => (
                  <div
                    key={role.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {role.name}
                        </p>

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

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {role.description ??
                        "No description available."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="mt-8 rounded-xl bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-900">
              Account Access
            </h3>

            <p className="mt-2 text-sm leading-6 text-blue-800">
              This account is currently{" "}
              {user.status.toLowerCase()}. Login access is
              controlled by the account status and password.
            </p>
          </section>

          {canManagePortal && (
            <section className="mt-8 rounded-xl bg-purple-50 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-sm font-semibold text-purple-900">
                    Portal Access
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-purple-800">
                    Link this {user.userType.toLowerCase()} login account
                    to the corresponding school record.
                  </p>
                </div>

                <a
                  href={`/users/${user.id}/portal-access`}
                  className="inline-flex w-fit rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Manage Portal Access
                </a>
              </div>
            </section>
          )}

          <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
            {canManageRoles && (
              <a
                href={`/users/${user.id}/roles`}
                className="rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Manage Roles
              </a>
            )}

            {canManagePortal && (
              <a
                href={`/users/${user.id}/portal-access`}
                className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-semibold text-white hover:bg-purple-700"
              >
                Portal Access
              </a>
            )}

            {canEdit && (
              <a
                href={`/users/${user.id}/edit`}
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Edit User
              </a>
            )}

            <a
              href="/users"
              className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Users
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}