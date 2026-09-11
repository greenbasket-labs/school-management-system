import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../src/lib/current-user";
import { hasPermission } from "../../../src/lib/permissions";
import { getSchool, updateSchool } from "../../../src/lib/school";

const FONT_OPTIONS = [
  ["system", "System Default"],
  ["inter", "Inter"],
  ["poppins", "Poppins"],
  ["roboto", "Roboto"],
] as const;

function cleanColor(value: FormDataEntryValue | null, fallback: string) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

async function saveSchool(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const allowed = await hasPermission(currentUser.id, "school.edit");
  if (!allowed) throw new Error("Permission denied: school.edit");

  await updateSchool({
    name: String(formData.get("name") ?? ""),
    motto: String(formData.get("motto") ?? ""),
    address: String(formData.get("address") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    website: String(formData.get("website") ?? ""),
    principalName: String(formData.get("principalName") ?? ""),
    registrationInfo: String(formData.get("registrationInfo") ?? ""),
    primaryColor: cleanColor(formData.get("primaryColor"), "#2563eb"),
    secondaryColor: cleanColor(formData.get("secondaryColor"), "#0f172a"),
    accentColor: cleanColor(formData.get("accentColor"), "#16a34a"),
    fontFamily: String(formData.get("fontFamily") ?? "system"),
  });

  redirect("/settings/school?saved=1");
}

export default async function SchoolSettingsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  if (!(await hasPermission(currentUser.id, "school.view"))) {
    throw new Error("Permission denied: school.view");
  }

  const school = await getSchool();
  const canEdit = await hasPermission(currentUser.id, "school.edit");

  const primaryColor = school?.primaryColor || "#2563eb";
  const secondaryColor = school?.secondaryColor || "#0f172a";
  const accentColor = school?.accentColor || "#16a34a";
  const fontFamily = school?.fontFamily || "system";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold text-blue-600">School Management System</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">School Setup</h1>
          </div>
          <a href="/dashboard" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to Dashboard</a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">School Information</h2>
            <p className="mt-2 text-sm text-slate-500">Configure the information that identifies this school throughout the system.</p>
          </div>

          {canEdit ? (
            <form action={saveSchool}>
              <div className="grid gap-6 md:grid-cols-2">
                {[
                  ["name", "School Name", school?.name ?? "", "Enter school name"],
                  ["motto", "Motto", school?.motto ?? "", "Enter school motto"],
                  ["phone", "Phone", school?.phone ?? "", "Enter school phone"],
                  ["email", "Email", school?.email ?? "", "Enter school email"],
                  ["website", "Website", school?.website ?? "", "https://example.com"],
                  ["principalName", "Principal / Head", school?.principalName ?? "", "Enter principal or head name"],
                ].map(([id, label, value, placeholder]) => (
                  <div key={id}>
                    <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                    <input id={id} name={id} type={id === "email" ? "email" : "text"} defaultValue={value} placeholder={placeholder} required={id === "name"} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                  </div>
                ))}

                <div className="md:col-span-2">
                  <label htmlFor="address" className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                  <input id="address" name="address" defaultValue={school?.address ?? ""} placeholder="Enter school address" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="registrationInfo" className="mb-2 block text-sm font-medium text-slate-700">Registration Information</label>
                  <textarea id="registrationInfo" name="registrationInfo" defaultValue={school?.registrationInfo ?? ""} placeholder="Enter school registration information" rows={4} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                </div>
              </div>

              <div className="mt-10 border-t border-slate-200 pt-8">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Appearance</h2>
                  <p className="mt-2 text-sm text-slate-500">Choose the school’s visual identity. These values are school-specific and have safe defaults.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    ["primaryColor", "Primary Color", primaryColor],
                    ["secondaryColor", "Secondary Color", secondaryColor],
                    ["accentColor", "Accent Color", accentColor],
                  ].map(([id, label, value]) => (
                    <div key={id}>
                      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
                      <div className="flex gap-3">
                        <input id={id} name={id} type="color" defaultValue={value} className="h-12 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
                        <input aria-label={`${label} hex value`} value={value} readOnly className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm text-slate-700" />
                      </div>
                    </div>
                  ))}

                  <div>
                    <label htmlFor="fontFamily" className="mb-2 block text-sm font-medium text-slate-700">Font Family</label>
                    <select id="fontFamily" name="fontFamily" defaultValue={fontFamily} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                      {FONT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button type="submit" className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700">Save School Settings</button>
              </div>
            </form>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {[
                ["School Name", school?.name], ["Motto", school?.motto], ["Address", school?.address], ["Phone", school?.phone],
                ["Email", school?.email], ["Website", school?.website], ["Principal / Head", school?.principalName],
                ["Registration Information", school?.registrationInfo], ["Primary Color", primaryColor], ["Secondary Color", secondaryColor],
                ["Accent Color", accentColor], ["Font Family", fontFamily],
              ].map(([label, value]) => (
                <div key={label} className={label === "Address" || label === "Registration Information" ? "md:col-span-2" : ""}>
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 whitespace-pre-wrap font-semibold text-slate-900">{value || "Not configured"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}