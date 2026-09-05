import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "../../../../src/lib/authorization";
import { getSchool } from "../../../../src/lib/school";
import { getTeacherById } from "../../../../src/lib/teachers";
import { db } from "../../../../src/prisma/db";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default async function EditTeacherPage({
  params,
}: PageProps) {
  const user = await requirePermission("teachers.edit");
  const school = await getSchool();

  const { id } = await params;
  const teacherId = Number(id);

  if (!Number.isInteger(teacherId)) {
    notFound();
  }

  const teacher = await getTeacherById(
    teacherId,
    user.schoolId,
  );

  if (!teacher) {
    notFound();
  }

  async function updateTeacher(formData: FormData) {
    "use server";

    const actor = await requirePermission("teachers.edit");
    const schoolRecord = await getSchool();

    if (!schoolRecord || schoolRecord.id !== actor.schoolId) {
      throw new Error("School not found.");
    }

    const currentTeacher =
      await getTeacherById(teacherId, actor.schoolId);

    if (!currentTeacher) {
      throw new Error("Teacher not found.");
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

    const teachers = await db.orm.public.Teacher.all();

    const schoolTeachers = teachers.filter(
      (item) =>
        item.schoolId === actor.schoolId &&
        item.id !== currentTeacher.id,
    );

    const duplicatePhone =
      phone &&
      schoolTeachers.some(
        (item) => item.phone === phone,
      );

    if (duplicatePhone) {
      throw new Error(
        "A teacher with this phone number already exists.",
      );
    }

    const duplicateEmail =
      email &&
      schoolTeachers.some(
        (item) =>
          item.email?.toLowerCase() ===
          email.toLowerCase(),
      );

    if (duplicateEmail) {
      throw new Error(
        "A teacher with this email already exists.",
      );
    }

    await db.orm.public.Teacher.where({
      id: currentTeacher.id,
    }).update({
      firstName,
      middleName: middleName || null,
      lastName,
      phone: phone || null,
      email: email || null,
      address: address || null,
      status: statusValue,
    });

    redirect(`/teachers/${currentTeacher.id}`);
  }

  const fullName = [
    teacher.firstName,
    teacher.middleName,
    teacher.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href={`/teachers/${teacher.id}`}
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            ← Back to Teacher Profile
          </Link>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Edit Teacher
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Update the teacher profile for {school?.name}.
          </p>
        </div>

        <form
          action={updateTeacher}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Permanent ID
            </label>

            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm font-semibold text-slate-700">
              {teacher.permanentId}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Permanent ID cannot be changed.
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current Teacher
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-900">
              {fullName}
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
                defaultValue={teacher.firstName}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                defaultValue={teacher.middleName ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              defaultValue={teacher.lastName}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                defaultValue={teacher.phone ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
                defaultValue={teacher.email ?? ""}
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              defaultValue={teacher.address ?? ""}
              className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
              defaultValue={teacher.status}
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
              href={`/teachers/${teacher.id}`}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}