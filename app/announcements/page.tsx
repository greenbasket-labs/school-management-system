import Link from "next/link";
import { requirePermission } from "../../src/lib/authorization";
import { getAnnouncements } from "../../src/lib/announcements";

function formatDate(value: unknown) {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AnnouncementsPage() {
  await requirePermission("announcements.view");

  const announcements = await getAnnouncements();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-600">
              Communication
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Announcements
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create and manage school announcements.
            </p>
          </div>

          <Link
            href="/announcements/new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            + New Announcement
          </Link>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Total</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {announcements.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Published</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">
              {announcements.filter((item) => item.isPublished).length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Drafts</p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {announcements.filter((item) => !item.isPublished).length}
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {announcements.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto max-w-md">
                <h2 className="text-lg font-semibold text-slate-900">
                  No announcements yet
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first announcement to communicate important
                  information to students, parents and teachers.
                </p>

                <Link
                  href="/announcements/new"
                  className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create Announcement
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Announcement
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Audience
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Status
                    </th>

                    <th className="px-6 py-4 font-semibold text-slate-700">
                      Created
                    </th>

                    <th className="px-6 py-4 text-right font-semibold text-slate-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {announcements.map((announcement) => (
                    <tr
                      key={announcement.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-6 py-5">
                        <div className="max-w-md">
                          <p className="font-semibold text-slate-900">
                            {announcement.title}
                          </p>

                          <p className="mt-1 line-clamp-2 text-slate-500">
                            {announcement.message}
                          </p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {announcement.audience}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        {announcement.isPublished ? (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                            Published
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Draft
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-6 py-5 text-slate-500">
                        {formatDate(announcement.createdAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <Link
                          href={`/announcements/${announcement.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}