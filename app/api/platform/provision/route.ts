import { NextResponse } from "next/server";
import {
  assertPlatformProvisioningSecret,
  provisionFromPlatform,
} from "../../../../../src/lib/platform-provisioning";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.startsWith("Bearer ")
      ? authorization.slice(7).trim()
      : null;

    assertPlatformProvisioningSecret(token);

    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, error: "Invalid request body." },
        { status: 400 },
      );
    }

    const result = await provisionFromPlatform(body);

    return NextResponse.json({
      success: true,
      status: "PROVISIONED",
      applicationId: result.applicationId,
      organizationId: result.organizationId,
      schoolId: result.schoolId,
      ownerId: result.ownerId,
      ownerPermanentId: result.permanentId,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Provisioning failed.";

    const clientError =
      message.endsWith("is required.") ||
      message.startsWith("Invalid ") ||
      message.includes("must be at least") ||
      message.includes("must be after") ||
      message.includes("already has a school");

    return NextResponse.json(
      {
        success: false,
        error: clientError ? message : "Provisioning failed.",
      },
      { status: clientError ? 400 : 500 },
    );
  }
}
