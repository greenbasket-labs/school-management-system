import { redirect } from "next/navigation";
import {
  getMyDevices,
  revokeMyDevice,
} from "../../../src/lib/devices";
import { requireAuth } from "../../../src/lib/authorization";

async function revokeDeviceAction(
  formData: FormData,
) {
  "use server";

  const sessionId = Number(
    formData.get("sessionId"),
  );

  if (!Number.isInteger(sessionId)) {
    redirect("/settings/devices?error=invalid");
  }

  try {
    await revokeMyDevice(sessionId);
  } catch {
    redirect("/settings/devices?error=failed");
  }

  redirect("/settings/devices?success=revoked");
}

export default async function DevicesPage() {
  await requireAuth();

  const devices = await getMyDevices();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <a
            href="/dashboard"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to dashboard
          </a>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            My devices
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Manage the devices currently signed in to
            your account.
          </p>
        </div>

        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-semibold text-slate-900">
                  Active sessions
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Maximum 2 active devices are allowed.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                {devices.length} / 2
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {devices.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-slate-500">
                No active devices found.
              </div>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {device.deviceName ??
                          "Unknown device"}
                      </h3>

                      {device.isCurrent && (
                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                          Current device
                        </span>
                      )}

                      {device.status === "LOCKED" && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          Locked
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      Last activity:{" "}
                      {new Date(
                        device.lastActivityAt,
                      ).toLocaleString()}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Signed in:{" "}
                      {new Date(
                        device.createdAt,
                      ).toLocaleString()}
                    </p>
                  </div>

                  {!device.isCurrent && (
                    <form action={revokeDeviceAction}>
                      <input
                        type="hidden"
                        name="sessionId"
                        value={device.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Revoke device
                      </button>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}