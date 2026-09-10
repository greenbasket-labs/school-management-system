import { NextResponse } from "next/server";
import {
  requirePortal,
  getStudentPortalRecord,
  getParentPortalStudents,
  getTeacherPortalStudents,
  type PortalFeature,
  type PortalType,
} from "../../../../../src/lib/portal-access";

const PORTALS: PortalType[] = ["STUDENT", "PARENT", "TEACHER"];
const FEATURES: PortalFeature[] = [
  "PORTAL",
  "PORTAL_PROFILE",
  "PORTAL_ATTENDANCE",
  "PORTAL_RESULTS",
  "PORTAL_REPORT_CARDS",
  "PORTAL_FEES",
  "PORTAL_RECEIPTS",
  "PORTAL_ANNOUNCEMENTS",
  "PORTAL_MESSAGES",
  "PORTAL_DOCUMENTS",
  "PORTAL_REQUESTS",
  "PORTAL_PAYMENTS",
];

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const portal = String(url.searchParams.get("portal") ?? "").toUpperCase() as PortalType;
    const feature = String(url.searchParams.get("feature") ?? "PORTAL").toUpperCase() as PortalFeature;

    if (!PORTALS.includes(portal)) {
      return NextResponse.json({ error: "Invalid portal." }, { status: 400 });
    }

    if (!FEATURES.includes(feature)) {
      return NextResponse.json({ error: "Invalid portal feature." }, { status: 400 });
    }

    const actor = await requirePortal(portal, feature);

    if (portal === "STUDENT") {
      const student = await getStudentPortalRecord(actor.id);
      return NextResponse.json({
        success: true,
        portal,
        feature,
        userId: actor.id,
        studentId: student?.id ?? null,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    if (portal === "PARENT") {
      const students = await getParentPortalStudents(actor.id);
      return NextResponse.json({
        success: true,
        portal,
        feature,
        userId: actor.id,
        studentIds: students.map((student) => student.id),
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const students = await getTeacherPortalStudents(actor.id);
    return NextResponse.json({
      success: true,
      portal,
      feature,
      userId: actor.id,
      studentIds: students.map((student) => student.id),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Portal access denied.";
    const status = message.includes("Authentication") ? 401 : message.includes("denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
