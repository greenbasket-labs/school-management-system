import { redirect } from "next/navigation";
import { getSession } from "../../src/lib/session";
import { unlockCurrentSession } from "../../src/lib/unlock";

async function unlockAction(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");

  if (!password) {
    redirect("/unlock?error=required");
  }

  const result = await unlockCurrentSession(password);

  if (!result.success) {
    if (result.reason === "INVALID_PASSWORD") {
      redirect("/unlock?error=invalid");
    }

    redirect("/login");
  }

  if (
    result.userType === "STUDENT" ||
    result.userType === "PARENT" ||
    result.userType === "TEACHER"
  ) {
    redirect("/portal");
  }

  redirect("/dashboard");
}

export default async function UnlockPage() {
  const session = await getSession();

  if (!session.userId || !session.sessionKey) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              School Management System
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Session locked
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Your session was locked after 2 hours of inactivity.
              Enter your password to continue.
            </p>
          </div>

          <form action={unlockAction} className="space-y-5">
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
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Unlock session
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <a
              href="/logout"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign out instead
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}