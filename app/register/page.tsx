import { redirect } from "next/navigation";
import { registerSchool } from "../../src/lib/register";

async function registerAction(
  formData: FormData,
) {
  "use server";

  const schoolName = String(
    formData.get("schoolName") ?? "",
  );

  const ownerName = String(
    formData.get("ownerName") ?? "",
  );

  const username = String(
    formData.get("username") ?? "",
  );

  const email = String(
    formData.get("email") ?? "",
  );

  const phone = String(
    formData.get("phone") ?? "",
  );

  const password = String(
    formData.get("password") ?? "",
  );

  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (password !== confirmPassword) {
    redirect(
      "/register?error=password_mismatch",
    );
  }

  try {
    await registerSchool({
      schoolName,
      ownerName,
      username,
      email,
      phone,
      password,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Registration failed.";

    redirect(
      `/register?error=${encodeURIComponent(message)}`,
    );
  }

  redirect("/login?registered=1");
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              School Management System
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Register your school
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create your school account and first
              Owner account.
            </p>
          </div>

          {params.error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          <form
            action={registerAction}
            className="space-y-6"
          >
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                School information
              </h2>

              <div className="mt-4">
                <label
                  htmlFor="schoolName"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  School name
                </label>

                <input
                  id="schoolName"
                  name="schoolName"
                  type="text"
                  required
                  placeholder="Enter your school name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Owner account
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="ownerName"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Full name
                  </label>

                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    required
                    placeholder="Owner full name"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    required
                    autoComplete="username"
                    placeholder="Choose a username"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
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
                    placeholder="owner@school.com"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                    type="tel"
                    placeholder="+234..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat your password"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Create school account
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <a
              href="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}