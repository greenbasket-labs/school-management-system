import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import {
  createFeeAssignment,
  getActiveFeeTypes,
  getAcademicSessionsForFees,
  getClassesForSession,
  getStudentsForFeeAssignment,
  getTermsForSession,
} from "../../../../src/lib/fees";
import { getSchool } from "../../../../src/lib/school";

type PageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewFeeAssignmentPage({
  searchParams,
}: PageProps) {
  const user = await requirePermission("fees.create");
  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const { error } = await searchParams;

  const [students, feeTypes, sessions] = await Promise.all([
    getStudentsForFeeAssignment(school.id),
    getActiveFeeTypes(school.id),
    getAcademicSessionsForFees(school.id),
  ]);

  const sessionOptions = await Promise.all(
    sessions.map(async (session) => {
      const [terms, classes] = await Promise.all([
        getTermsForSession(session.id),
        getClassesForSession(
          school.id,
          session.id,
        ),
      ]);

      return {
        session,
        terms,
        classes,
      };
    }),
  );

  async function createFeeAssignmentAction(
    formData: FormData,
  ) {
    "use server";

    const actor = await requirePermission("fees.create");
    const currentSchool = await getSchool();

    if (
      !currentSchool ||
      currentSchool.id !== actor.schoolId
    ) {
      redirect("/dashboard");
    }

    const studentId = Number(
      formData.get("studentId"),
    );

    const feeTypeId = Number(
      formData.get("feeTypeId"),
    );

    const sessionId = Number(
      formData.get("sessionId"),
    );

    const termValue = String(
      formData.get("termId") ?? "",
    );

    const classValue = String(
      formData.get("classId") ?? "",
    );

    const amount = Number(
      formData.get("amount"),
    );

    const dueDateValue = String(
      formData.get("dueDate") ?? "",
    );

    const description = String(
      formData.get("description") ?? "",
    );

    const termId = termValue
      ? Number(termValue)
      : undefined;

    const classId = classValue
      ? Number(classValue)
      : undefined;

    const dueDate = dueDateValue
      ? new Date(`${dueDateValue}T00:00:00`)
      : undefined;

    try {
      await createFeeAssignment({
        schoolId: currentSchool.id,
        studentId,
        feeTypeId,
        sessionId,
        termId,
        classId,
        amount,
        dueDate,
        description,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to assign fee.";

      redirect(
        `/fees/assignments/new?error=${encodeURIComponent(
          message,
        )}`,
      );
    }

    redirect("/fees/assignments");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/fees/assignments"
          className="text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          ← Fee Assignments
        </Link>

        <div className="mt-4">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Assign Fee
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Assign a specific fee amount to a student.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {feeTypes.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">
              No active fee types
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Create and activate a fee type before assigning
              fees to students.
            </p>

            <Link
              href="/fees/types/new"
              className="mt-4 inline-flex rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Fee Type
            </Link>
          </div>
        ) : students.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">
              No active students
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              An active student is required before a fee can
              be assigned.
            </p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold text-amber-900">
              No academic session
            </h2>

            <p className="mt-2 text-sm text-amber-800">
              Create an academic session before assigning
              student fees.
            </p>
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <form
              action={createFeeAssignmentAction}
              className="space-y-6"
            >
              {/* STUDENT */}

              <div>
                <label
                  htmlFor="studentId"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Student
                </label>

                <select
                  id="studentId"
                  name="studentId"
                  required
                  defaultValue=""
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select student
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.firstName}{" "}
                      {student.middleName
                        ? `${student.middleName} `
                        : ""}
                      {student.lastName} —{" "}
                      {student.permanentId}
                    </option>
                  ))}
                </select>
              </div>

              {/* FEE TYPE */}

              <div>
                <label
                  htmlFor="feeTypeId"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Fee Type
                </label>

                <select
                  id="feeTypeId"
                  name="feeTypeId"
                  required
                  defaultValue=""
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select fee type
                  </option>

                  {feeTypes.map((feeType) => (
                    <option
                      key={feeType.id}
                      value={feeType.id}
                    >
                      {feeType.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SESSION */}

              <div>
                <label
                  htmlFor="sessionId"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Academic Session
                </label>

                <select
                  id="sessionId"
                  name="sessionId"
                  required
                  defaultValue=""
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="" disabled>
                    Select academic session
                  </option>

                  {sessionOptions.map(
                    ({ session }) => (
                      <option
                        key={session.id}
                        value={session.id}
                      >
                        {session.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              {/* TERM */}

              <div>
                <label
                  htmlFor="termId"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Term
                </label>

                <select
                  id="termId"
                  name="termId"
                  defaultValue=""
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    All Terms / Not specified
                  </option>

                  {sessionOptions.flatMap(
                    ({ session, terms }) =>
                      terms.map((term) => (
                        <option
                          key={term.id}
                          value={term.id}
                        >
                          {session.name} — {term.name}
                        </option>
                      )),
                  )}
                </select>

                <p className="mt-1.5 text-xs text-slate-500">
                  Select a specific term or leave blank for a
                  session-wide fee.
                </p>
              </div>

              {/* CLASS */}

              <div>
                <label
                  htmlFor="classId"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Class
                </label>

                <select
                  id="classId"
                  name="classId"
                  defaultValue=""
                  className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">
                    All Classes / Not specified
                  </option>

                  {sessionOptions.flatMap(
                    ({ session, classes }) =>
                      classes.map((schoolClass) => (
                        <option
                          key={schoolClass.id}
                          value={schoolClass.id}
                        >
                          {session.name} —{" "}
                          {schoolClass.name}
                          {schoolClass.section
                            ? ` ${schoolClass.section}`
                            : ""}
                        </option>
                      )),
                  )}
                </select>

                <p className="mt-1.5 text-xs text-slate-500">
                  Class selection is optional.
                </p>
              </div>

              {/* AMOUNT */}

              <div>
                <label
                  htmlFor="amount"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Amount
                </label>

                <div className="relative mt-2">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                    ₦
                  </span>

                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="150000.00"
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 pl-8 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
              </div>

              {/* DUE DATE */}

              <div>
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Due Date
                </label>

                <input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Optional.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-semibold text-slate-900"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  maxLength={500}
                  placeholder="Optional note about this fee..."
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {/* INFORMATION */}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  What happens after assignment?
                </h3>

                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  <li>
                    • The fee becomes part of the student's
                    balance.
                  </li>

                  <li>
                    • It appears in the student's financial
                    history.
                  </li>

                  <li>
                    • Future payments will reduce the
                    outstanding balance.
                  </li>

                  <li>
                    • The original assignment remains part of
                    the financial record.
                  </li>
                </ul>
              </div>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
                <Link
                  href="/fees/assignments"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </Link>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Assign Fee
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}