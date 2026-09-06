import { redirect } from "next/navigation";
import { requestPasswordRecovery } from "../../src/lib/password-recovery";

async function recoveryAction(formData: FormData) {
  "use server";

  const login = String(formData.get("login") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? "",
  );

  if (newPassword !== confirmPassword) {
    redirect("/forgot-password?error=mismatch");
  }

  try {
    const result = await requestPasswordRecovery({
      login,
      newPassword,
    });

    redirect(
      `/forgot-password?success=1&token=${encodeURIComponent(result.token)}`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to process recovery.";

    redirect(
      `/forgot-password?error=${encodeURIComponent(message)}`,
    );
  }
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    success?: string;
    token?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <p className="text-sm font-semibold text-blue-600">
              School Management System
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              Reset password
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Enter your account details and choose a new password.
            </p>
          </div>

          {params.error && (
            <div className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {params.error}
            </div>
          )}

          {params.success && params.token ? (
            <div className="space-y-5">
              <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Recovery request created successfully.
              </div>

              <a
                href={`/reset-password?token=${encodeURIComponent(params.token)}`}
                className="block w-full rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Continue password reset
              </a>
            </div>
          ) : (
            <form action={recoveryAction} className="space-y-5">
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
                  required
                  placeholder="Enter your email, username or phone"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  New password
                </label>

                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  minLength={8}
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
                  required
                  placeholder="Repeat your new password"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Start password recovery
              </button>
            </form>
          )}

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