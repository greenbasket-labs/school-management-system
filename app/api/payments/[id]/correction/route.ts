import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../src/lib/authorization";
import { getSchool } from "../../../../../src/lib/school";
import { correctPayment } from "../../../../../src/lib/payment-correction";

const ACTIONS = ["REFUND", "CANCEL"] as const;

type Action = (typeof ACTIONS)[number];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    const { id } = await params;
    const paymentId = Number(id);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return NextResponse.json({ error: "Invalid payment ID." }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action ?? "") as Action;
    const reason = String(body.reason ?? "");

    if (!ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid correction action." }, { status: 400 });
    }

    const result = await correctPayment({
      schoolId: school.id,
      paymentId,
      actorUserId: actor.id,
      action,
      reason,
    });

    return NextResponse.json({
      success: true,
      paymentId,
      status: result.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to correct payment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
