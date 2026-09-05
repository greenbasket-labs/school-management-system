import { redirect } from "next/navigation";
import { getSchool, updateSchool } from "../../../src/lib/school";

async function saveSchool(formData: FormData) {
"use server";

await updateSchool({
name: String(formData.get("name") ?? ""),
motto: String(formData.get("motto") ?? ""),
address: String(formData.get("address") ?? ""),
phone: String(formData.get("phone") ?? ""),
email: String(formData.get("email") ?? ""),
website: String(formData.get("website") ?? ""),
principalName: String(formData.get("principalName") ?? ""),
registrationInfo: String(formData.get("registrationInfo") ?? ""),
});

redirect("/settings/school?saved=1");
}

export default async function SchoolSettingsPage() {
const school = await getSchool();

return ( <main className="min-h-screen bg-slate-50"> <header className="border-b border-slate-200 bg-white"> <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5"> <div> <p className="text-sm font-semibold text-blue-600">
School Management System </p>

        <h1 className="mt-1 text-2xl font-bold text-slate-900">
          School Setup
        </h1>
      </div>

      <a
        href="/dashboard"
        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Back to Dashboard
      </a>
    </div>
  </header>

  <div className="mx-auto max-w-5xl px-6 py-8">
    <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-900">
          School Information
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Configure the information that identifies this school throughout
          the system.
        </p>
      </div>

      <form action={saveSchool}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              School Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              defaultValue={school?.name ?? ""}
              placeholder="Enter school name"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="motto"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Motto
            </label>

            <input
              id="motto"
              name="motto"
              type="text"
              defaultValue={school?.motto ?? ""}
              placeholder="Enter school motto"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="address"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Address
            </label>

            <input
              id="address"
              name="address"
              type="text"
              defaultValue={school?.address ?? ""}
              placeholder="Enter school address"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Phone
            </label>

            <input
              id="phone"
              name="phone"
              type="text"
              defaultValue={school?.phone ?? ""}
              placeholder="Enter school phone"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              defaultValue={school?.email ?? ""}
              placeholder="Enter school email"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="website"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Website
            </label>

            <input
              id="website"
              name="website"
              type="text"
              defaultValue={school?.website ?? ""}
              placeholder="https://example.com"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="principalName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Principal / Head
            </label>

            <input
              id="principalName"
              name="principalName"
              type="text"
              defaultValue={school?.principalName ?? ""}
              placeholder="Enter principal or head name"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-2">
            <label
              htmlFor="registrationInfo"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Registration Information
            </label>

            <textarea
              id="registrationInfo"
              name="registrationInfo"
              defaultValue={school?.registrationInfo ?? ""}
              placeholder="Enter school registration information"
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Save School Information
          </button>
        </div>
      </form>
    </div>
  </div>
</main>

);
}
