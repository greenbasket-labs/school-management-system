import { db } from "../prisma/db";
import { getCurrentUser } from "./current-user";
import { writeAuditLog } from "./audit";

async function getSchoolId() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.schoolId) {
    throw new Error("School not found");
  }

  return currentUser.schoolId;
}

export async function getAnnouncements() {
  const schoolId = await getSchoolId();

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
  const schoolId = await getSchoolId();

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
      item.schoolId === schoolId,
  );

  if (!user) {
    throw new Error("User not found");
  }

  const announcement =
    await db.orm.public.Announcement.create({
      schoolId,
      createdByUserId,
      title: cleanTitle,
      message: cleanMessage,
      audience: cleanAudience,
      isPublished: false,
      publishedAt: null,
    });

  await writeAuditLog({
    schoolId,
    userId: createdByUserId,
    action: "CREATE",
    entity: "Announcement",
    entityId: announcement.id,
    newValue: {
      title: cleanTitle,
      audience: cleanAudience,
      isPublished: false,
    },
  });

  return announcement;
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

  const updated =
    await db.orm.public.Announcement.where({
      id: announcementId,
    }).update({
      title: cleanTitle,
      message: cleanMessage,
      audience: cleanAudience,
    });

  await writeAuditLog({
    schoolId: announcement.schoolId,
    action: "UPDATE",
    entity: "Announcement",
    entityId: announcementId,
    oldValue: {
      title: announcement.title,
      message: announcement.message,
      audience: announcement.audience,
    },
    newValue: {
      title: cleanTitle,
      message: cleanMessage,
      audience: cleanAudience,
    },
  });

  return updated;
}

export async function publishAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  const updated =
    await db.orm.public.Announcement.where({
      id: announcementId,
    }).update({
      isPublished: true,
      publishedAt: new Date(),
    });

  await writeAuditLog({
    schoolId: announcement.schoolId,
    action: "PUBLISH",
    entity: "Announcement",
    entityId: announcementId,
    oldValue: {
      isPublished: announcement.isPublished,
    },
    newValue: {
      isPublished: true,
    },
  });

  return updated;
}

export async function unpublishAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  const updated =
    await db.orm.public.Announcement.where({
      id: announcementId,
    }).update({
      isPublished: false,
      publishedAt: null,
    });

  await writeAuditLog({
    schoolId: announcement.schoolId,
    action: "UNPUBLISH",
    entity: "Announcement",
    entityId: announcementId,
    oldValue: {
      isPublished: announcement.isPublished,
    },
    newValue: {
      isPublished: false,
    },
  });

  return updated;
}

export async function deleteAnnouncement(
  announcementId: number,
) {
  const announcement =
    await getAnnouncementById(announcementId);

  if (!announcement) {
    throw new Error("Announcement not found");
  }

  const deleted =
    await db.orm.public.Announcement.where({
      id: announcementId,
    }).delete();

  await writeAuditLog({
    schoolId: announcement.schoolId,
    action: "DELETE",
    entity: "Announcement",
    entityId: announcementId,
    oldValue: {
      title: announcement.title,
      audience: announcement.audience,
      isPublished: announcement.isPublished,
    },
  });

  return deleted;
}