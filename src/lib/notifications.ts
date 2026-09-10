import { db } from "../prisma/db";
import { writeAuditLog } from "./audit";

export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "PUSH";

export type NotificationType =
  | "ANNOUNCEMENT"
  | "ABSENCE"
  | "LATE"
  | "RESULT_PUBLISHED"
  | "FEE_CREATED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "BALANCE_REMINDER"
  | "DEADLINE_APPROACHING"
  | "GENERAL";

export type NotificationAudience =
  | "ALL"
  | "PARENTS"
  | "STUDENTS"
  | "TEACHERS"
  | "STAFF"
  | "CLASS"
  | "ARM"
  | "SELECTED";

export type NotificationRecord = {
  id: string;
  schoolId: number;
  recipientUserId: number;
  type: NotificationType;
  title: string;
  message: string;
  channels: NotificationChannel[];
  read: boolean;
  createdAt: Date;
};

const notifications = new Map<string, NotificationRecord>();

function notificationKey(schoolId: number, userId: number) {
  return `${schoolId}:${userId}`;
}

async function getSchoolId() {
  const schools = await db.orm.public.School.all();

  if (schools.length === 0) {
    throw new Error("School not found");
  }

  return schools[0].id;
}

async function assertSchoolUser(schoolId: number, userId: number) {
  const users = await db.orm.public.User.all();
  const user = users.find(
    (item) => item.id === userId && item.schoolId === schoolId,
  );

  if (!user || user.status === "DISABLED") {
    throw new Error("Notification recipient not found or disabled");
  }

  return user;
}

export async function createNotification(input: {
  recipientUserId: number;
  type: NotificationType;
  title: string;
  message: string;
  channels?: NotificationChannel[];
}) {
  const schoolId = await getSchoolId();
  await assertSchoolUser(schoolId, input.recipientUserId);

  const title = input.title.trim();
  const message = input.message.trim();

  if (!title) throw new Error("Notification title is required");
  if (!message) throw new Error("Notification message is required");

  const record: NotificationRecord = {
    id: crypto.randomUUID(),
    schoolId,
    recipientUserId: input.recipientUserId,
    type: input.type,
    title,
    message,
    channels: input.channels?.length ? input.channels : ["IN_APP"],
    read: false,
    createdAt: new Date(),
  };

  notifications.set(record.id, record);

  await writeAuditLog({
    schoolId,
    action: "CREATE",
    entity: "Notification",
    entityId: record.id,
    newValue: {
      recipientUserId: record.recipientUserId,
      type: record.type,
      channels: record.channels,
    },
  });

  return record;
}

export async function getUserNotifications(userId: number) {
  const schoolId = await getSchoolId();
  await assertSchoolUser(schoolId, userId);

  return Array.from(notifications.values())
    .filter(
      (item) => item.schoolId === schoolId && item.recipientUserId === userId,
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getUnreadNotificationCount(userId: number) {
  const items = await getUserNotifications(userId);
  return items.filter((item) => !item.read).length;
}

export async function markNotificationRead(
  notificationId: string,
  userId: number,
) {
  const schoolId = await getSchoolId();
  await assertSchoolUser(schoolId, userId);

  const notification = notifications.get(notificationId);

  if (
    !notification ||
    notification.schoolId !== schoolId ||
    notification.recipientUserId !== userId
  ) {
    throw new Error("Notification not found");
  }

  notification.read = true;
  notifications.set(notification.id, notification);
  return notification;
}

export async function markAllNotificationsRead(userId: number) {
  const schoolId = await getSchoolId();
  await assertSchoolUser(schoolId, userId);

  let count = 0;
  for (const notification of notifications.values()) {
    if (
      notification.schoolId === schoolId &&
      notification.recipientUserId === userId &&
      !notification.read
    ) {
      notification.read = true;
      notifications.set(notification.id, notification);
      count += 1;
    }
  }

  return count;
}

export function getNotificationAudienceUsers(
  users: Array<{ id: number; schoolId: number; userType: string; status: string }>,
  schoolId: number,
  audience: NotificationAudience,
) {
  return users.filter((user) => {
    if (user.schoolId !== schoolId || user.status === "DISABLED") return false;

    switch (audience) {
      case "PARENTS":
        return user.userType === "PARENT";
      case "STUDENTS":
        return user.userType === "STUDENT";
      case "TEACHERS":
        return user.userType === "TEACHER";
      case "STAFF":
        return ["STAFF", "ADMIN", "CASHIER"].includes(user.userType);
      case "ALL":
        return true;
      default:
        return false;
    }
  });
}

export function buildNotification(
  type: NotificationType,
  title: string,
  message: string,
  channels: NotificationChannel[] = ["IN_APP"],
) {
  return { type, title: title.trim(), message: message.trim(), channels };
}
