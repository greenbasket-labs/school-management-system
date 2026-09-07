import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../src/lib/current-user";
import { hasPermission } from "../../../../src/lib/permissions";
import { getSchool } from "../../../../src/lib/school";
import {
  assignRoleToUser,
  getRoles,
  getUserRolesById,
  removeRoleFromUser,
} from "../../../../src/lib/roles";
import { db } from "../../../../src/prisma/db";

type RolesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserRolesPage({
  params,
}: RolesPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.manage_roles",
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
              You do not have permission to manage user roles.
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
    redirect("/users");
  }

  const school = await getSchool();

  if (!school) {
    redirect("/users");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    redirect("/users");
  }

  async function assignRole(formData: FormData) {
    "use server";

    const actor = await getCurrentUser();

    if (!actor) {
      redirect("/login");
    }

    const canManage = await hasPermission(
      actor.id,
      "users.manage_roles",
    );

    if (!canManage) {
      throw new Error(
        "Permission denied: users.manage_roles",
      );
    }

    const targetUserId = Number(
      formData.get("userId"),
    );

    const roleId = Number(
      formData.get("roleId"),
    );

    if (
      !Number.isInteger(targetUserId) ||
      !Number.isInteger(roleId)
    ) {
      throw new Error("Invalid role assignment.");
    }

    const actorSchool = await getSchool();

    if (!actorSchool) {
      throw new Error("School not found.");
    }

    const allUsers = await db.orm.public.User.all();

    const targetUser = allUsers.find(
      (item) =>
        item.id === targetUserId &&
        item.schoolId === actorSchool.id,
    );

    if (!targetUser) {
      throw new Error(
        "User not found in your school.",
      );
    }

    const roles = await getRoles();

    const role = roles.find(
      (item) => item.id === roleId,
    );

    if (!role) {
      throw new Error("Role not found.");
    }

    await assignRoleToUser(
      targetUserId,
      roleId,
    );

    redirect(
      `/users/${targetUserId}/roles`,
    );
  }

  async function removeRole(formData: FormData) {
    "use server";

    const actor = await getCurrentUser();

    if (!actor) {
      redirect("/login");
    }

    const canManage = await hasPermission(
      actor.id,
      "users.manage_roles",
    );

    if (!canManage) {
      throw new Error(
        "Permission denied: users.manage_roles",
      );
    }

    const targetUserId = Number(
      formData.get("userId"),
    );

    const roleId = Number(
      formData.get("roleId"),
    );

    if (
      !Number.isInteger(targetUserId) ||
      !Number.isInteger(roleId)
    ) {
      throw new Error("Invalid role removal.");
    }

    const actorSchool = await getSchool();

    if (!actorSchool) {
      throw new Error("School not found.");
    }

    const allUsers = await db.orm.public.User.all();

    const targetUser = allUsers.find(
      (item) =>
        item.id === targetUserId &&
        item.schoolId === actorSchool.id,
    );

    if (!targetUser) {
      throw new Error(
        "User not found in your school.",
      );
    }

    const roles = await getRoles();

    const role = roles.find(
      (item) => item.id === roleId,
    );

    if (!role) {
      throw new Error("Role not found.");
    }

    await removeRoleFromUser(
      targetUserId,
      roleId,
    );

    redirect(
      `/users/${targetUserId}/roles`,
    );
  }

  const roles = await getRoles();
  const userRoles = await getUserRolesById(userId);

  const assignedRoleIds = new Set(
    userRoles.map((role) => role.id),
  );

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school.name}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Manage User Roles
            </h1>
          </div>

          <a
            href={`/users/${user.id}`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Profile
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 pb-6">
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

          <section className="mt-8">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Available Roles
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Assign or remove roles for this user.
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {roles.length} roles
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {roles.map((role) => {
                const assigned = assignedRoleIds.has(
                  role.id,
                );

                return (
                  <div
                    key={role.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="font-semibold text-slate-900">
                          {role.name}
                        </h4>

                        {role.isSystem && (
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            System
                          </span>
                        )}

                        {assigned && (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Assigned
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {role.description ??
                          "No description available."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/roles/${role.id}`}
                        className="w-fit rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View Permissions
                      </a>

                      {assigned ? (
                        <form action={removeRole}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />

                          <input
                            type="hidden"
                            name="roleId"
                            value={role.id}
                          />

                          <button
                            type="submit"
                            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                          >
                            Remove Role
                          </button>
                        </form>
                      ) : (
                        <form action={assignRole}>
                          <input
                            type="hidden"
                            name="userId"
                            value={user.id}
                          />

                          <input
                            type="hidden"
                            name="roleId"
                            value={role.id}
                          />

                          <button
                            type="submit"
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            Assign Role
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}