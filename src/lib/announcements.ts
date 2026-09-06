import { db } from "../prisma/db";

export async function getAnnouncements() {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const schoolId = schools[0].id;

  const announcements = await db.orm.public.Announcement.all();

  return announcements
    .filter((announcement) => announcement.schoolId === schoolId)
    .sort((a, b) => {
      const aDate = a.createdAt
        ? new Date(a.createdAt).getTime()
        : 0;

      const bDate = b.createdAt
        ? new Date(b.createdAt).getTime()
        : 0;

      return bDate - aDate;
    });
}

export async function getPublishedAnnouncements() {
  const announcements = await getAnnouncements();

  return announcements.filter(
    (announcement) => announcement.isPublished,
  );
}

export async function getAnnouncementById(
  announcementId: number,
) {
  const announcements = await getAnnouncements();

  return (
    announcements.find(
      (announcement) => announcement.id === announcementId,
    ) ?? null
  );
}

export async function createAnnouncement(
  createdByUserId: number,
  title: string,
  message: string,
  audience = "ALL",
) {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  const cleanAudience = audience.trim() || "ALL";

  if (!cleanTitle) {
    throw new Error("Announcement title is required");
  }

  if (!cleanMessage) {
    throw new Error("Announcement message is required");
  }

  const users = await db.orm.public.User.all();

  const user = users.find(
    (item) =>
      item.id === createdByUserId &&
      item.schoolId === schools[0].id,
  );

  if (!user) {
    throw new Error("User not found");
  }

  return db.orm.public.Announcement.create({
    schoolId: schools[0].id,
    createdByUserId,
    title: cleanTitle,
    message: cleanMessage,
    audience: cleanAudience,
    isPublished: false,
    publishedAt: null,
  });
}

export async function updateAnnouncement(
  announcementId: number,
  title: string,
  message: string,
  audience = "ALL",
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  const cleanTitle = title.trim();
  const cleanMessage = message.trim();
  const cleanAudience = audience.trim() || "ALL";

  if (!cleanTitle) {
    throw new Error("Announcement title is required");
  }

  if (!cleanMessage) {
    throw new Error("Announcement message is required");
  }

  return db.orm.public.Announcement.where({
    id: announcementId,
  }).update({
    title: cleanTitle,
    message: cleanMessage,
    audience: cleanAudience,
  });
}

export async function publishAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  return db.orm.public.Announcement.where({
    id: announcementId,
  }).update({
    isPublished: true,
    publishedAt: new Date(),
  });
}

export async function unpublishAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  return db.orm.public.Announcement.where({
    id: announcementId,
  }).update({
    isPublished: false,
    publishedAt: null,
  });
}

export async function deleteAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  return db.orm.public.Announcement.where({
    id: announcementId,
  }).delete();
}