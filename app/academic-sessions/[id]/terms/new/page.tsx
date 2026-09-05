import Link from "next/link";
import { redirect } from "next/navigation";
import { Temporal } from "@js-temporal/polyfill";

import { requirePermission } from "../../../../../src/lib/authorization";
import { getAcademicSessionById } from "../../../../../src/lib/academic-sessions";
import { db } from "../../../../../src/prisma/db";

const TERM_OPTIONS = [
  { value: "FIRST", label: "First Term" },
  { value: "SECOND", label: "Second Term" },
  { value: "THIRD", label: "Third Term" },
] as const;

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

export default async function NewTermPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);

  if (!Number.isInteger(sessionId)) {
    redirect("/academic-sessions");
  }

  const actor = await requirePermission("academics.create");

  const session = await getAcademicSessionById(
    sessionId,
    actor.schoolId,
  );

  if (!session) {
    redirect("/academic-sessions");
  }

  async function createTerm(formData: FormData) {
    "use server";

    const actor = await requirePermission("academics.create");

    const currentSession =
      await getAcademicSessionById(sessionId, actor.schoolId);

    if (!currentSession) {
      throw new Error("Academic session not found.");
    }

    const termValue = String(
      formData.get("term") ?? "",
    ).trim();

    if (
      termValue !== "FIRST" &&
      termValue !== "SECOND" &&
      termValue !== "THIRD"
    ) {
      throw new Error("Invalid academic term.");
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

    if (!name) {
      throw new Error("Term name is required.");
    }

    if (!startDateValue) {
      throw new Error("Start date is required.");
    }

    if (!endDateValue) {
      throw new Error("End date is required.");
    }

    const startDate = toTemporalInstant(
      startDateValue,
      "start date",
    );

    const endDate = toTemporalInstant(
      endDateValue,
      "end date",
    );

    if (
      Temporal.Instant.compare(startDate, endDate) >= 0
    ) {
      throw new Error(
        "End date must be after the start date.",
      );
    }

    const terms = await db.orm.public.Term.all();

    const duplicate = terms.find(
      (item) =>
        item.sessionId === sessionId &&
        item.term === termValue,
    );

    if (duplicate) {
      throw new Error(
        "This term already exists for this academic session.",
      );
    }

    const wantsActive =
      formData.get("isActive") === "on";

    if (wantsActive) {
      for (const existingTerm of terms) {
        if (
          existingTerm.sessionId === sessionId &&
          existingTerm.isActive
        ) {
          await db.orm.public.Term
            .where({ id: existingTerm.id })
            .update({
              isActive: false,
            });
        }
      }
    }

    await db.orm.public.Term.create({
      sessionId,
      term: termValue,
      name,
      startDate,
      endDate,
      isActive: wantsActive,
    });

    redirect(`/academic-sessions/${sessionId}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href={`/academic-sessions/${sessionId}`}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to {session.name}
          </Link>

          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            Add Academic Term
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Create a term for the {session.name} academic session.
          </p>
        </div>

        <form
          action={createTerm}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label
                htmlFor="term"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Term
              </label>

              <select
                id="term"
                name="term"
                required
                defaultValue="FIRST"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              >
                {TERM_OPTIONS.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Term Name
              </label>

              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="First Term"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="startDate"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Start Date
              </label>

              <input
                id="startDate"
                name="startDate"
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="endDate"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                End Date
              </label>

              <input
                id="endDate"
                name="endDate"
                type="date"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="isActive"
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Make this the active term
                </span>

                <span className="mt-1 block text-xs text-slate-600">
                  Only one term can be active within an academic
                  session. Activating this term will deactivate
                  the current active term.
                </span>
              </span>
            </label>
          </div>

          <div className="mt-8 flex items-center justify-end gap-3">
            <Link
              href={`/academic-sessions/${sessionId}`}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Term
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}