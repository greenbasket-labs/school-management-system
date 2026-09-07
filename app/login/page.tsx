import { redirect } from "next/navigation";
import { authenticateUser } from "../../src/lib/login";
import { getSchool } from "../../src/lib/school";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

async function loginAction(formData: FormData) {
  "use server";

  const login = String(formData.get("login") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await authenticateUser(
    login,
    password,
  );

  if (!result.success) {
    redirect(
      result.reason === "DEVICE_LIMIT"
        ? "/login?error=device-limit"
        : "/login?error=invalid",
    );
  }

  const user = result.user;

  if (
    user.userType === "STUDENT" ||
    user.userType === "PARENT" ||
    user.userType === "TEACHER"
  ) {
    redirect("/portal");
  }

  redirect("/dashboard");
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const school = await getSchool();
  const params = await searchParams;

  const error = params.error;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              {school?.name ??
                "School Management System"}
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Sign in
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {school?.motto ??
                "Sign in to access your school dashboard."}
            </p>
          </div>

          {error === "device-limit" && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">
                Maximum 2 active devices reached.
              </p>

              <p className="mt-1">
                Revoke one existing device before
                signing in on this device.
              </p>
            </div>
          )}

          {error === "invalid" && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Invalid email, username, phone or
              password.
            </div>
          )}

          <form action={loginAction} className="space-y-5">
            <div>
              <label
                htmlFor="login"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email, username or phone
              </label>

              <input
                id="login"
                name="login"
                type="text"
                autoComplete="username"
                placeholder="Enter your email, username or phone"
                required
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
                autoComplete="current-password"
                placeholder="Enter your password"
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-2 text-right">
                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Sign in
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <a
              href="/"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to school home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}