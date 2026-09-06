import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "../../../src/lib/authorization";
import { createAnnouncement } from "../../../src/lib/announcements";

async function createAnnouncementAction(formData: FormData) {
  "use server";

  const user = await requirePermission("announcements.create");

  const title = String(formData.get("title") ?? "");
  const message = String(formData.get("message") ?? "");
  const audience = String(formData.get("audience") ?? "ALL");

  await createAnnouncement(
    user.id,
    title,
    message,
    audience,
  );

  redirect("/announcements");
}

export default async function NewAnnouncementPage() {
  await requirePermission("announcements.create");

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8">
          <Link
            href="/announcements"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to announcements
          </Link>

          <p className="mt-6 text-sm font-semibold text-blue-600">
            Communication
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            New Announcement
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create an announcement for your school community.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <form action={createAnnouncementAction} className="space-y-6">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                type="text"
                placeholder="e.g. First Term Examination Notice"
                required
                maxLength={200}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="audience"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Audience
              </label>

              <select
                id="audience"
                name="audience"
                defaultValue="ALL"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">Everyone</option>
                <option value="STUDENT">Students</option>
                <option value="PARENT">Parents</option>
                <option value="TEACHER">Teachers</option>
              </select>

              <p className="mt-2 text-xs text-slate-400">
                Audience targeting is currently basic. More advanced targeting
                can be added later.
              </p>
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Message
              </label>

              <textarea
                id="message"
                name="message"
                rows={10}
                placeholder="Write your announcement..."
                required
                className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/announcements"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Create Announcement
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}