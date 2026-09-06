import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../src/lib/current-user";
import { hasPermission } from "../../../../src/lib/permissions";
import { getSchool } from "../../../../src/lib/school";
import { db } from "../../../../src/prisma/db";

type PortalAccessPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type PortalUserType = "STUDENT" | "PARENT" | "TEACHER";

async function linkPortalAccount(
  userId: number,
  formData: FormData,
) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.edit",
  );

  if (!allowed) {
    throw new Error("Permission denied: users.edit");
  }

  const school = await getSchool();

  if (!school) {
    throw new Error("School not found");
  }

  const targetUsers = await db.orm.public.User.all();

  const targetUser = targetUsers.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!targetUser) {
    throw new Error("User not found");
  }

  const validTypes: PortalUserType[] = [
    "STUDENT",
    "PARENT",
    "TEACHER",
  ];

  if (!validTypes.includes(targetUser.userType as PortalUserType)) {
    throw new Error(
      "Only student, parent and teacher accounts can have portal access.",
    );
  }

  const recordId = Number(
    formData.get("recordId") ?? "",
  );

  if (!Number.isInteger(recordId)) {
    throw new Error("Please select a record");
  }

  if (targetUser.userType === "STUDENT") {
    const students = await db.orm.public.Student.all();

    const student = students.find(
      (item) =>
        item.id === recordId &&
        item.schoolId === school.id,
    );

    if (!student) {
      throw new Error("Student not found");
    }

    if (student.userId && student.userId !== userId) {
      throw new Error(
        "This student is already linked to another user account.",
      );
    }

    await db.orm.public.Student
      .where({ id: student.id })
      .update({
        userId,
      });
  }

  if (targetUser.userType === "PARENT") {
    const parents = await db.orm.public.Parent.all();

    const parent = parents.find(
      (item) =>
        item.id === recordId &&
        item.schoolId === school.id,
    );

    if (!parent) {
      throw new Error("Parent not found");
    }

    if (parent.userId && parent.userId !== userId) {
      throw new Error(
        "This parent is already linked to another user account.",
      );
    }

    await db.orm.public.Parent
      .where({ id: parent.id })
      .update({
        userId,
      });
  }

  if (targetUser.userType === "TEACHER") {
    const teachers = await db.orm.public.Teacher.all();

    const teacher = teachers.find(
      (item) =>
        item.id === recordId &&
        item.schoolId === school.id,
    );

    if (!teacher) {
      throw new Error("Teacher not found");
    }

    if (teacher.userId && teacher.userId !== userId) {
      throw new Error(
        "This teacher is already linked to another user account.",
      );
    }

    await db.orm.public.Teacher
      .where({ id: teacher.id })
      .update({
        userId,
      });
  }

  redirect(`/users/${userId}/portal-access`);
}

export default async function PortalAccessPage({
  params,
}: PortalAccessPageProps) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  const allowed = await hasPermission(
    currentUser.id,
    "users.edit",
  );

  if (!allowed) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-2xl px-6 py-16">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
            <h1 className="text-2xl font-bold text-slate-900">
              Access Denied
            </h1>

            <p className="mt-3 text-sm text-slate-500">
              You do not have permission to manage portal access.
            </p>

            <a
              href="/users"
              className="mt-6 inline-block rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Back to Users
            </a>
          </div>
        </div>
      </main>
    );
  }

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    redirect("/users");
  }

  const school = await getSchool();

  if (!school) {
    redirect("/users");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === userId &&
      item.schoolId === school.id,
  );

  if (!user) {
    redirect("/users");
  }

  if (
    user.userType !== "STUDENT" &&
    user.userType !== "PARENT" &&
    user.userType !== "TEACHER"
  ) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                {school.name}
              </p>

              <h1 className="mt-1 text-2xl font-bold text-slate-900">
                Portal Access
              </h1>
            </div>

            <a
              href={`/users/${user.id}`}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Back to User
            </a>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-bold text-slate-900">
              Portal Not Applicable
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Portal access is available for Student, Parent and Teacher
              accounts only.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const students = await db.orm.public.Student.all();
  const parents = await db.orm.public.Parent.all();
  const teachers = await db.orm.public.Teacher.all();

  const availableStudents = students.filter(
    (item) =>
      item.schoolId === school.id &&
      (!item.userId || item.userId === user.id),
  );

  const availableParents = parents.filter(
    (item) =>
      item.schoolId === school.id &&
      (!item.userId || item.userId === user.id),
  );

  const availableTeachers = teachers.filter(
    (item) =>
      item.schoolId === school.id &&
      (!item.userId || item.userId === user.id),
  );

  let linkedRecordId: number | null = null;
  let linkedName = "";

  if (user.userType === "STUDENT") {
    const linked = students.find(
      (item) =>
        item.schoolId === school.id &&
        item.userId === user.id,
    );

    if (linked) {
      linkedRecordId = linked.id;
      linkedName = `${linked.firstName} ${linked.middleName ?? ""} ${linked.lastName}`
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (user.userType === "PARENT") {
    const linked = parents.find(
      (item) =>
        item.schoolId === school.id &&
        item.userId === user.id,
    );

    if (linked) {
      linkedRecordId = linked.id;
      linkedName = `${linked.firstName} ${linked.middleName ?? ""} ${linked.lastName}`
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  if (user.userType === "TEACHER") {
    const linked = teachers.find(
      (item) =>
        item.schoolId === school.id &&
        item.userId === user.id,
    );

    if (linked) {
      linkedRecordId = linked.id;
      linkedName = `${linked.firstName} ${linked.middleName ?? ""} ${linked.lastName}`
        .replace(/\s+/g, " ")
        .trim();
    }
  }

  const options =
    user.userType === "STUDENT"
      ? availableStudents.map((item) => ({
          id: item.id,
          label: `${item.firstName} ${item.middleName ?? ""} ${item.lastName}`
            .replace(/\s+/g, " ")
            .trim() + ` — ${item.permanentId}`,
        }))
      : user.userType === "PARENT"
        ? availableParents.map((item) => ({
            id: item.id,
            label: `${item.firstName} ${item.middleName ?? ""} ${item.lastName}`
              .replace(/\s+/g, " ")
              .trim() + ` — ${item.permanentId}`,
          }))
        : availableTeachers.map((item) => ({
            id: item.id,
            label: `${item.firstName} ${item.middleName ?? ""} ${item.lastName}`
              .replace(/\s+/g, " ")
              .trim() + ` — ${item.permanentId}`,
          }));

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              {school.name}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Portal Access
            </h1>
          </div>

          <a
            href={`/users/${user.id}`}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Back to User
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 pb-6">
            <p className="text-sm font-medium text-slate-500">
              {user.userType}
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              {user.name}
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              {user.permanentId}
            </p>
          </div>

          {linkedRecordId ? (
            <section className="mt-8 rounded-xl bg-green-50 p-6">
              <p className="text-sm font-semibold text-green-900">
                Portal Account Linked
              </p>

              <p className="mt-2 text-sm text-green-800">
                This account is linked to:
              </p>

              <p className="mt-1 text-lg font-bold text-green-900">
                {linkedName}
              </p>

              <p className="mt-3 text-sm text-green-800">
                The user can now sign in and access the portal.
              </p>
            </section>
          ) : (
            <section className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Link School Record
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select the existing {user.userType.toLowerCase()} record that
                belongs to this login account.
              </p>

              <form
                action={linkPortalAccount.bind(null, user.id)}
                className="mt-6 space-y-6"
              >
                <div>
                  <label
                    htmlFor="recordId"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {user.userType === "STUDENT"
                      ? "Student"
                      : user.userType === "PARENT"
                        ? "Parent / Guardian"
                        : "Teacher"}
                  </label>

                  <select
                    id="recordId"
                    name="recordId"
                    required
                    defaultValue=""
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="" disabled>
                      Select record
                    </option>

                    {options.map((option) => (
                      <option
                        key={option.id}
                        value={option.id}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {options.length === 0 && (
                  <div className="rounded-xl bg-amber-50 p-5">
                    <p className="text-sm font-semibold text-amber-900">
                      No available records
                    </p>

                    <p className="mt-2 text-sm leading-6 text-amber-800">
                      There are no unlinked {user.userType.toLowerCase()}{" "}
                      records available in this school.
                    </p>
                  </div>
                )}

                <div className="flex justify-end border-t border-slate-100 pt-6">
                  <button
                    type="submit"
                    disabled={options.length === 0}
                    className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Link Portal Account
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}