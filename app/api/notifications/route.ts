import { NextResponse } from "next/server";
import { requireAuth } from "../../../src/lib/authorization";
import {
  createNotification,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../../../src/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const actor = await requireAuth();
    const notifications = await getUserNotifications(actor.id);

    return NextResponse.json(
      { success: true, count: notifications.length, notifications },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load notifications.";
    const status = message.includes("Authentication") ? 401 : 403;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth();
    const body = await request.json();
    const action = String(body.action ?? "");

    if (action === "read-all") {
      const count = await markAllNotificationsRead(actor.id);
      return NextResponse.json({ success: true, updated: count }, { status: 200 });
    }

    if (action === "read") {
      const notificationId = String(body.notificationId ?? "").trim();
      if (!notificationId) {
        return NextResponse.json({ error: "notificationId is required." }, { status: 400 });
      }

      const notification = await markNotificationRead(notificationId, actor.id);
      return NextResponse.json({ success: true, notification }, { status: 200 });
    }

    if (action === "create") {
      const recipientUserId = Number(body.recipientUserId);
      if (!Number.isInteger(recipientUserId) || recipientUserId <= 0) {
        return NextResponse.json({ error: "Invalid recipientUserId." }, { status: 400 });
      }

      const notification = await createNotification({
        recipientUserId,
        type: body.type,
        title: String(body.title ?? ""),
        message: String(body.message ?? ""),
        channels: Array.isArray(body.channels) ? body.channels : undefined,
      });

      return NextResponse.json({ success: true, notification }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid notification action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to process notification.";
    const status = message.includes("Authentication") ? 401 : message.includes("Permission denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
