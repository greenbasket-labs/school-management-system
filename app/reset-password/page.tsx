import { redirect } from "next/navigation";
import { activatePasswordRecovery } from "../../src/lib/password-recovery";

async function resetAction(formData: FormData) {
  "use server";

  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (!token) {
    redirect("/login");
  }

  if (password.length < 8) {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=short`,
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=mismatch`,
    );
  }

  try {
    await activatePasswordRecovery(token);

    redirect("/login?reset=success");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to reset password.";

    redirect(
      `/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`,
    );
  }
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
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
              Set new password
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Enter and confirm your new password.
            </p>
          </div>

          {params.error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          <form action={resetAction} className="space-y-5">
            <input
              type="hidden"
              name="token"
              value={token}
            />

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                New password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                placeholder="Minimum 8 characters"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Confirm new password
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
                placeholder="Repeat your new password"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Activate new password
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <a
              href="/login"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}