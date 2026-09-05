import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../src/lib/current-user";
import { hasPermission } from "../../../src/lib/permissions";
import { createUser } from "../../../src/lib/users";
import { getSchool } from "../../../src/lib/school";

async function createUserAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = await hasPermission(user.id, "users.create");

  if (!allowed) {
    throw new Error("Permission denied: users.create");
  }

  await createUser({
    name: String(formData.get("name") ?? ""),
    userType: String(formData.get("userType") ?? "") as
      | "ADMIN"
      | "TEACHER"
      | "CASHIER"
      | "STUDENT"
      | "PARENT"
      | "STAFF",
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  redirect("/users");
}

export default async function NewUserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const allowed = await hasPermission(user.id, "users.create");

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              Access Denied
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              You do not have permission to create users.
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

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ?? "School Management System"}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Add User
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
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">
              User Information
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create an account for a school administrator, teacher, cashier,
              student, parent or staff member.
            </p>
          </div>

          <form action={createUserAction} className="space-y-8">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Basic Information
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
                    placeholder="Enter full name"
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
                    defaultValue=""
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Select user type
                    </option>
                    <option value="ADMIN">Admin</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="CASHIER">Cashier</option>
                    <option value="STUDENT">Student</option>
                    <option value="PARENT">Parent / Guardian</option>
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
                    placeholder="Enter email address"
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
                    placeholder="Enter phone number"
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
                    placeholder="Choose username"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Temporary Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter temporary password"
                    required
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </section>

            <section className="rounded-xl bg-blue-50 p-5">
              <h3 className="text-sm font-semibold text-blue-900">
                Permanent ID
              </h3>

              <p className="mt-2 text-sm leading-6 text-blue-800">
                The system will generate the permanent ID automatically based
                on the selected user type. You do not need to enter it manually.
              </p>
            </section>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <a
                href="/users"
                className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </a>

              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create User
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}