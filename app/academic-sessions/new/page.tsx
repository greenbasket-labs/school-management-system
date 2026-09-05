import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";
import { Temporal } from "@js-temporal/polyfill";

function toTemporalInstant(value: string, fieldName: string) {
  try {
    const date = Temporal.PlainDate.from(value);

    return date
      .toZonedDateTime({
        timeZone: "UTC",
      })
      .toInstant();
  } catch {
    throw new Error(`Invalid ${fieldName}.`);
  }
}

async function createAcademicSession(formData: FormData) {
  "use server";

  const actor = await requirePermission("academics.create");

  const name = String(formData.get("name") ?? "").trim();
  const startDate = String(formData.get("startDate") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();

  if (!name) {
    throw new Error("Academic session name is required.");
  }

  if (!startDate) {
    throw new Error("Start date is required.");
  }

  if (!endDate) {
    throw new Error("End date is required.");
  }

  const start = toTemporalInstant(startDate, "start date");
  const end = toTemporalInstant(endDate, "end date");

  if (Temporal.Instant.compare(end, start) <= 0) {
    throw new Error("End date must be after start date.");
  }

  const sessions = await db.orm.public.AcademicSession.all();

  const duplicate = sessions.some(
    (session) =>
      session.schoolId === actor.schoolId &&
      session.name.trim().toLowerCase() === name.toLowerCase(),
  );

  if (duplicate) {
    throw new Error("An academic session with this name already exists.");
  }

  await db.orm.public.AcademicSession.create({
    schoolId: actor.schoolId,
    name,
    status: "DRAFT",
    startDate: start,
    endDate: end,
  });

  redirect("/academic-sessions");
}

export default async function NewAcademicSessionPage() {
  const user = await requirePermission("academics.create");
  const school = await getSchool();

  if (school.id !== user.schoolId) {
    throw new Error("School access mismatch.");
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/academic-sessions"
          className="mb-6 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to Academic Sessions
        </Link>

        <section className="rounded-xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h1 className="text-2xl font-bold text-gray-900">
              New Academic Session
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Create an academic session for {school.name}.
            </p>
          </div>

          <form action={createAcademicSession} className="space-y-6 p-6">
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-gray-700"
              >
                Session Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="2026/2027"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-gray-500">
                Example: 2026/2027
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Initial Status
              </p>

              <p className="mt-1 text-sm text-blue-800">
                New academic sessions are created as{" "}
                <strong>DRAFT</strong>. You can activate the session after
                its terms and setup are ready.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/academic-sessions"
                className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Academic Session
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}