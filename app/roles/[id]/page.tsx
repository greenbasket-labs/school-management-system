import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../src/lib/current-user";
import { hasPermission } from "../../../src/lib/permissions";
import { db } from "../../../src/prisma/db";

type RolePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RoleDetailsPage({
  params,
}: RolePageProps) {
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

  const { id } = await params;
  const roleId = Number(id);

  if (!Number.isInteger(roleId)) {
    redirect("/roles");
  }

  const roles = await db.orm.public.Role.all();

  const role = roles.find(
    (item) => item.id === roleId,
  );

  if (!role) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              Role Not Found
            </h1>

            <p className="mt-2 text-slate-500">
              The requested role does not exist.
            </p>

            <a
              href="/roles"
              className="mt-6 inline-block rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to Roles
            </a>
          </div>
        </div>
      </main>
    );
  }

  const rolePermissions =
    await db.orm.public.RolePermission.all();

  const permissions =
    await db.orm.public.Permission.all();

  const assignedPermissionIds = rolePermissions
    .filter(
      (item) => item.roleId === role.id,
    )
    .map((item) => item.permissionId);

  const assignedPermissions = permissions
    .filter((permission) =>
      assignedPermissionIds.includes(permission.id),
    )
    .sort((a, b) =>
      a.code.localeCompare(b.code),
    );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Role Management
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {role.name}
            </h1>
          </div>

          <a
            href="/roles"
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Roles
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {role.name}
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Role ID: {role.id}
              </p>
            </div>

            {role.isSystem && (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                System Role
              </span>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {role.description ??
              "No description available."}
          </p>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Assigned Permissions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {assignedPermissions.length} permission
              {assignedPermissions.length === 1
                ? ""
                : "s"} assigned to this role.
            </p>
          </div>

          {assignedPermissions.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                No permissions are currently assigned
                to this role.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {assignedPermissions.map(
                (permission) => (
                  <div
                    key={permission.id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <h3 className="font-semibold text-slate-900">
                      {permission.name}
                    </h3>

                    <p className="mt-1 text-xs font-mono text-blue-600">
                      {permission.code}
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {permission.description ??
                        "No description available."}
                    </p>
                  </div>
                ),
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}