import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";

import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import {
  getAcademicSessionById,
} from "../../../../src/lib/academic-sessions";
import { db } from "../../../../src/prisma/db";

const STATUS_OPTIONS = [
  "DRAFT",
  "ACTIVE",
] as const;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDateForInput(value: unknown) {
  if (!value) {
    return "";
  }

  const text = String(value);
  const datePart = text.slice(0, 10);

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  return "";
}

function parseDate(
  value: string,
  fieldName: string,
) {
  try {
    return Temporal.PlainDate.from(value)
      .toZonedDateTime({
        timeZone: "UTC",
      })
      .toInstant();
  } catch {
    throw new Error(`Invalid ${fieldName}.`);
  }
}

export default async function AcademicSessionEditPage({
  params,
}: PageProps) {
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    notFound();
  }

  const actor =
    await requirePermission("academics.edit");

  const school = await getSchool();

  if (actor.schoolId !== school.id) {
    throw new Error("School access denied.");
  }

  const session = await getAcademicSessionById(
    sessionId,
    school.id,
  );

  if (!session) {
    notFound();
  }

  async function updateSessionAction(
    formData: FormData,
  ) {
    "use server";

    const currentActor =
      await requirePermission("academics.edit");

    const currentSchool = await getSchool();

    if (
      currentActor.schoolId !== currentSchool.id
    ) {
      throw new Error("School access denied.");
    }

    const currentSession =
      await getAcademicSessionById(
        sessionId,
        currentSchool.id,
      );

    if (!currentSession) {
      throw new Error(
        "Academic session not found.",
      );
    }

    const name = String(
      formData.get("name") ?? "",
    ).trim();

    const startDateValue = String(
      formData.get("startDate") ?? "",
    ).trim();

    const endDateValue = String(
      formData.get("endDate") ?? "",
    ).trim();

    const statusValue = String(
      formData.get("status") ?? "",
    ).trim();

    if (!name) {
      throw new Error(
        "Academic session name is required.",
      );
    }

    if (!startDateValue) {
      throw new Error(
        "Start date is required.",
      );
    }

    if (!endDateValue) {
      throw new Error(
        "End date is required.",
      );
    }

    if (
      !STATUS_OPTIONS.includes(
        statusValue as (typeof STATUS_OPTIONS)[number],
      )
    ) {
      throw new Error(
        "Invalid academic session status.",
      );
    }

    const startDate = parseDate(
      startDateValue,
      "start date",
    );

    const endDate = parseDate(
      endDateValue,
      "end date",
    );

    if (
      Temporal.Instant.compare(
        endDate,
        startDate,
      ) <= 0
    ) {
      throw new Error(
        "End date must be after start date.",
      );
    }

    const sessions =
      await db.orm.public.AcademicSession.all();

    const duplicate = sessions.find(
      (item) =>
        item.schoolId === currentSchool.id &&
        item.id !== currentSession.id &&
        item.name.trim().toLowerCase() ===
          name.toLowerCase(),
    );

    if (duplicate) {
      throw new Error(
        "An academic session with this name already exists.",
      );
    }

    const status =
      statusValue as (typeof STATUS_OPTIONS)[number];

    if (status === "ACTIVE") {
      for (const item of sessions) {
        if (
          item.schoolId === currentSchool.id &&
          item.id !== currentSession.id &&
          item.status === "ACTIVE"
        ) {
          await db.orm.public.AcademicSession.where({
            id: item.id,
          }).update({
            status: "DRAFT",
          });
        }
      }
    }

    await db.orm.public.AcademicSession.where({
      id: currentSession.id,
    }).update({
      name,
      startDate,
      endDate,
      status,
    });

    redirect(
      `/academic-sessions/${currentSession.id}`,
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href={`/academic-sessions/${session.id}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Academic Session
          </Link>

          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Edit Academic Session
          </h1>

          <p className="text-sm text-slate-500">
            Update session details and activation
            status.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form
            action={updateSessionAction}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Academic Session
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                defaultValue={session.name}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <p className="mt-1 text-xs text-slate-500">
                Example: 2026/2027
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="startDate"
                  className="block text-sm font-medium text-slate-700"
                >
                  Start Date
                </label>

                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={formatDateForInput(
                    session.startDate,
                  )}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="endDate"
                  className="block text-sm font-medium text-slate-700"
                >
                  End Date
                </label>

                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={formatDateForInput(
                    session.endDate,
                  )}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="status"
                className="block text-sm font-medium text-slate-700"
              >
                Status
              </label>

              <select
                id="status"
                name="status"
                required
                defaultValue={session.status}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
              <p className="text-sm font-semibold text-blue-900">
                Session activation
              </p>

              <p className="mt-1 text-sm text-blue-800">
                Only one academic session can be
                ACTIVE for this school. Activating
                this session will automatically move
                any other active session to DRAFT.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>

              <Link
                href={`/academic-sessions/${session.id}`}
                className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}