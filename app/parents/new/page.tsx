import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";

const STATUS_OPTIONS = ["ACTIVE", "INACTIVE"] as const;

function getNextParentPermanentId(permanentIds: string[]) {
  const year = new Date().getFullYear();
  const prefix = `PAR-${year}-`;

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

  const nextNumber = highestNumber + 1;

  return `${prefix}${String(nextNumber).padStart(5, "0")}`;
}

export default async function NewParentPage() {
  const actor = await requirePermission("parents.create");
  const school = await getSchool();

  const parents = await db.orm.public.Parent.all();

  const parentPermanentId = getNextParentPermanentId(
    parents.map((parent) => parent.permanentId),
  );

  async function createParent(formData: FormData) {
    "use server";

    const currentActor = await requirePermission("parents.create");

    const firstName = String(formData.get("firstName") ?? "").trim();
    const middleName = String(formData.get("middleName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const statusValue = String(formData.get("status") ?? "ACTIVE");

    if (!firstName) {
      throw new Error("First name is required.");
    }

    if (!lastName) {
      throw new Error("Last name is required.");
    }

    if (
      !STATUS_OPTIONS.includes(
        statusValue as (typeof STATUS_OPTIONS)[number],
      )
    ) {
      throw new Error("Invalid parent status.");
    }

    const allParents = await db.orm.public.Parent.all();

    const schoolParents = allParents.filter(
      (parent) => parent.schoolId === currentActor.schoolId,
    );

    if (
      phone &&
      schoolParents.some(
        (parent) =>
          parent.phone?.trim() === phone,
      )
    ) {
      throw new Error(
        "A parent with this phone number already exists.",
      );
    }

    if (
      email &&
      schoolParents.some(
        (parent) =>
          parent.email?.trim().toLowerCase() ===
          email.toLowerCase(),
      )
    ) {
      throw new Error(
        "A parent with this email already exists.",
      );
    }

    const permanentId = getNextParentPermanentId(
      schoolParents.map((parent) => parent.permanentId),
    );

    const parent = await db.orm.public.Parent.create({
      schoolId: currentActor.schoolId,
      permanentId,
      firstName,
      middleName: middleName || null,
      lastName,
      phone: phone || null,
      email: email || null,
      address: address || null,
      status: statusValue as (typeof STATUS_OPTIONS)[number],
    });

    redirect(`/parents/${parent.id}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link
            href="/parents"
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            ← Back to Parents
          </Link>

          <div className="mt-4">
            <p className="text-sm font-medium text-slate-500">
              {school.name}
            </p>

            <h1 className="text-3xl font-bold text-slate-900">
              Add Parent / Guardian
            </h1>

            <p className="mt-1 text-sm text-slate-600">
              Create a parent or guardian record. Students can be
              linked after the parent record is created.
            </p>
          </div>
        </div>

        <form
          action={createParent}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Permanent ID
            </label>

            <input
              value={parentPermanentId}
              readOnly
              className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"
            />

            <p className="mt-1 text-xs text-slate-500">
              Generated automatically and remains permanent.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              />
            </div>

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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
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
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
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
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
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
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <Link
              href="/parents"
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Create Parent
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}