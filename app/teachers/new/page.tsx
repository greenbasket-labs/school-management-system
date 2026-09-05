import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function getNextTeacherPermanentId(permanentIds: string[]) {
  const year = new Date().getFullYear();
  const prefix = `TEA-${year}-`;

  let highestNumber = 0;

  for (const permanentId of permanentIds) {
    if (!permanentId.startsWith(prefix)) {
      continue;
    }

    const numberPart = permanentId.slice(prefix.length);
    const number = Number(numberPart);

    if (Number.isInteger(number) && number > highestNumber) {
      highestNumber = number;
    }
  }

  return `${prefix}${String(highestNumber + 1).padStart(5, "0")}`;
}

export default async function NewTeacherPage() {
  const user = await requirePermission("teachers.create");
  const school = await getSchool();

  const teachers = await db.orm.public.Teacher.all();

  const schoolTeacherIds = teachers
    .filter((teacher) => teacher.schoolId === user.schoolId)
    .map((teacher) => teacher.permanentId);

  const permanentId = getNextTeacherPermanentId(
    schoolTeacherIds,
  );

  async function createTeacher(formData: FormData) {
    "use server";

    const actor = await requirePermission("teachers.create");
    const schoolRecord = await getSchool();

    if (!schoolRecord || schoolRecord.id !== actor.schoolId) {
      throw new Error("School not found.");
    }

    const firstName = String(
      formData.get("firstName") ?? "",
    ).trim();

    const middleName = String(
      formData.get("middleName") ?? "",
    ).trim();

    const lastName = String(
      formData.get("lastName") ?? "",
    ).trim();

    const phone = String(
      formData.get("phone") ?? "",
    ).trim();

    const email = String(
      formData.get("email") ?? "",
    ).trim();

    const address = String(
      formData.get("address") ?? "",
    ).trim();

    const statusValue = String(
      formData.get("status") ?? "ACTIVE",
    ).trim();

    if (!firstName) {
      throw new Error("First name is required.");
    }

    if (!lastName) {
      throw new Error("Last name is required.");
    }

    if (
      statusValue !== "ACTIVE" &&
      statusValue !== "INACTIVE"
    ) {
      throw new Error("Invalid teacher status.");
    }

    if (email && !email.includes("@")) {
      throw new Error("Invalid email address.");
    }

    const existingTeachers =
      await db.orm.public.Teacher.all();

    const schoolTeachers = existingTeachers.filter(
      (teacher) => teacher.schoolId === actor.schoolId,
    );

    const permanentId = getNextTeacherPermanentId(
      schoolTeachers.map(
        (teacher) => teacher.permanentId,
      ),
    );

    const duplicatePhone =
      phone &&
      schoolTeachers.some(
        (teacher) => teacher.phone === phone,
      );

    if (duplicatePhone) {
      throw new Error(
        "A teacher with this phone number already exists.",
      );
    }

    const duplicateEmail =
      email &&
      schoolTeachers.some(
        (teacher) =>
          teacher.email?.toLowerCase() ===
          email.toLowerCase(),
      );

    if (duplicateEmail) {
      throw new Error(
        "A teacher with this email already exists.",
      );
    }

    const teacher =
      await db.orm.public.Teacher.create({
        schoolId: actor.schoolId,
        permanentId,
        firstName,
        middleName: middleName || null,
        lastName,
        phone: phone || null,
        email: email || null,
        address: address || null,
        status: statusValue,
      });

    redirect(`/teachers/${teacher.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/teachers"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Teachers
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Add Teacher
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Add a teacher to {school?.name}.
          </p>
        </div>

        <form
          action={createTeacher}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Permanent ID
            </label>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-700">
              {permanentId}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Generated automatically and remains permanent.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-semibold text-slate-700"
              >
                First Name *
              </label>

              <input
                id="firstName"
                name="firstName"
                required
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label
                htmlFor="middleName"
                className="block text-sm font-semibold text-slate-700"
              >
                Middle Name
              </label>

              <input
                id="middleName"
                name="middleName"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="Enter middle name"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-semibold text-slate-700"
            >
              Last Name *
            </label>

            <input
              id="lastName"
              name="lastName"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter last name"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-slate-700"
              >
                Phone
              </label>

              <input
                id="phone"
                name="phone"
                type="tel"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="e.g. 08012345678"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="teacher@example.com"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-semibold text-slate-700"
            >
              Address
            </label>

            <textarea
              id="address"
              name="address"
              rows={3}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter teacher address"
            />
          </div>

          <div>
            <label
              htmlFor="status"
              className="block text-sm font-semibold text-slate-700"
            >
              Status
            </label>

            <select
              id="status"
              name="status"
              defaultValue="ACTIVE"
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/teachers"
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Create Teacher
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}