import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "../../../src/lib/authorization";
import {
  deleteAnnouncement,
  getAnnouncementById,
  publishAnnouncement,
  unpublishAnnouncement,
  updateAnnouncement,
} from "../../../src/lib/announcements";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function updateAnnouncementAction(formData: FormData) {
  "use server";

  await requirePermission("announcements.edit");

  const announcementId = Number(
    formData.get("announcementId"),
  );

  const title = String(formData.get("title") ?? "");
  const message = String(formData.get("message") ?? "");
  const audience = String(
    formData.get("audience") ?? "ALL",
  );

  if (!Number.isInteger(announcementId)) {
    throw new Error("Invalid announcement");
  }

  await updateAnnouncement(
    announcementId,
    title,
    message,
    audience,
  );

  redirect(`/announcements/${announcementId}`);
}

async function publishAnnouncementAction(formData: FormData) {
  "use server";

  await requirePermission("announcements.edit");

  const announcementId = Number(
    formData.get("announcementId"),
  );

  if (!Number.isInteger(announcementId)) {
    throw new Error("Invalid announcement");
  }

  await publishAnnouncement(announcementId);

  redirect(`/announcements/${announcementId}`);
}

async function unpublishAnnouncementAction(
  formData: FormData,
) {
  "use server";

  await requirePermission("announcements.edit");

  const announcementId = Number(
    formData.get("announcementId"),
  );

  if (!Number.isInteger(announcementId)) {
    throw new Error("Invalid announcement");
  }

  await unpublishAnnouncement(announcementId);

  redirect(`/announcements/${announcementId}`);
}

async function deleteAnnouncementAction(formData: FormData) {
  "use server";

  await requirePermission("announcements.delete");

  const announcementId = Number(
    formData.get("announcementId"),
  );

  if (!Number.isInteger(announcementId)) {
    throw new Error("Invalid announcement");
  }

  await deleteAnnouncement(announcementId);

  redirect("/announcements");
}

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

export default async function AnnouncementPage({
  params,
}: PageProps) {
  const { id } = await params;
  const announcementId = Number(id);

  if (!Number.isInteger(announcementId)) {
    throw new Error("Invalid announcement");
  }

  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  const canEdit = await (async () => {
    try {
      await requirePermission("announcements.edit");
      return true;
    } catch {
      return false;
    }
  })();

  const canDelete = await (async () => {
    try {
      await requirePermission("announcements.delete");
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-8">
          <Link
            href="/announcements"
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            ← Back to announcements
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-blue-600">
                Communication
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                {announcement.title}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Created {formatDate(announcement.createdAt)}
              </p>
            </div>

            {announcement.isPublished ? (
              <span className="w-fit rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                Published
              </span>
            ) : (
              <span className="w-fit rounded-full bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700">
                Draft
              </span>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="mb-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Audience
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {announcement.audience}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Published
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(announcement.publishedAt)}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {announcement.message}
              </p>
            </div>
          </div>

          {canEdit && (
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <h2 className="text-lg font-bold text-slate-900">
                Edit Announcement
              </h2>

              <form
                action={updateAnnouncementAction}
                className="mt-6 space-y-5"
              >
                <input
                  type="hidden"
                  name="announcementId"
                  value={announcement.id}
                />

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
                    defaultValue={announcement.title}
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
                    defaultValue={announcement.audience}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="ALL">Everyone</option>
                    <option value="STUDENT">Students</option>
                    <option value="PARENT">Parents</option>
                    <option value="TEACHER">Teachers</option>
                  </select>
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
                    rows={8}
                    defaultValue={announcement.message}
                    required
                    className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              Publication
            </h2>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {canEdit &&
                !announcement.isPublished && (
                  <form action={publishAnnouncementAction}>
                    <input
                      type="hidden"
                      name="announcementId"
                      value={announcement.id}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                    >
                      Publish Announcement
                    </button>
                  </form>
                )}

              {canEdit &&
                announcement.isPublished && (
                  <form action={unpublishAnnouncementAction}>
                    <input
                      type="hidden"
                      name="announcementId"
                      value={announcement.id}
                    />

                    <button
                      type="submit"
                      className="w-full rounded-xl border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-700 hover:bg-amber-50 sm:w-auto"
                    >
                      Unpublish
                    </button>
                  </form>
                )}

              {canDelete && (
                <form action={deleteAnnouncementAction}>
                  <input
                    type="hidden"
                    name="announcementId"
                    value={announcement.id}
                  />

                  <button
                    type="submit"
                    className="w-full rounded-xl border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 sm:w-auto"
                  >
                    Delete
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}