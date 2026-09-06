import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "../../../../src/lib/current-user";
import { hasPermission } from "../../../../src/lib/permissions";
import { getSchool } from "../../../../src/lib/school";
import { db } from "../../../../src/prisma/db";

type EditUserPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type EditableUserType =
  | "ADMIN"
  | "TEACHER"
  | "CASHIER"
  | "STUDENT"
  | "PARENT"
  | "STAFF";

type EditableUserStatus =
  | "PENDING"
  | "ACTIVE"
  | "SUSPENDED"
  | "DISABLED";

async function updateUserAction(
  userId: number,
  formData: FormData,
) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.edit",
  );

  if (!allowed) {
    throw new Error("Permission denied: users.edit");
  }

  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    throw new Error("User not found in this school");
  }

  const name = String(formData.get("name") ?? "").trim();

  const userType = String(
    formData.get("userType") ?? "",
  ) as EditableUserType;

  const emailValue = String(
    formData.get("email") ?? "",
  ).trim();

  const phoneValue = String(
    formData.get("phone") ?? "",
  ).trim();

  const usernameValue = String(
    formData.get("username") ?? "",
  ).trim();

  const status = String(
    formData.get("status") ?? "",
  ) as EditableUserStatus;

  if (!name) {
    throw new Error("Full name is required");
  }

  const validUserTypes: EditableUserType[] = [
    "ADMIN",
    "TEACHER",
    "CASHIER",
    "STUDENT",
    "PARENT",
    "STAFF",
  ];

  const validStatuses: EditableUserStatus[] = [
    "PENDING",
    "ACTIVE",
    "SUSPENDED",
    "DISABLED",
  ];

  if (!validUserTypes.includes(userType)) {
    throw new Error("Invalid user type");
  }

  if (!validStatuses.includes(status)) {
    throw new Error("Invalid account status");
  }

  await db.orm.public.User
    .where({
      id: userId,
      schoolId: school.id,
    })
    .update({
      name,
      userType,
      email: emailValue || null,
      phone: phoneValue || null,
      username: usernameValue
        ? usernameValue.toLowerCase()
        : null,
      status,
    });

  redirect(`/users/${userId}`);
}

export default async function EditUserPage({
  params,
}: EditUserPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.edit",
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
              You do not have permission to edit users.
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
    notFound();
  }

  const school = await getSchool();

  if (!school) {
    notFound();
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school.name}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Edit User
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
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500">
              {user.permanentId}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {user.name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Update the user's account information.
            </p>
          </div>

          <form
            action={updateUserAction.bind(null, user.id)}
            className="space-y-8"
          >
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Account Information
              </h3>

              <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full Name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={user.name}
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="userType"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    User Type
                  </label>

                  <select
                    id="userType"
                    name="userType"
                    defaultValue={user.userType}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="STUDENT">Student</option>
                    <option value="PARENT">
                      Parent / Guardian
                    </option>
                    <option value="STAFF">Other Staff</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={user.email ?? ""}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Phone
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="text"
                    defaultValue={user.phone ?? ""}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="username"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Username
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    defaultValue={user.username ?? ""}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Account Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue={user.status}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-amber-50 p-5">
              <h3 className="text-sm font-semibold text-amber-900">
                Permanent ID
              </h3>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Permanent ID cannot be changed. It remains the user's
                permanent identity throughout the school system.
              </p>

              <p className="mt-3 text-sm font-semibold text-amber-900">
                {user.permanentId}
              </p>
            </section>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <a
                href={`/users/${user.id}`}
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </a>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}