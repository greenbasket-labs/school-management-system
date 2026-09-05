import { NextResponse } from "next/server";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { createPayment } from "../../../src/lib/payments";

const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "POS",
  "ONLINE",
  "OTHER",
] as const;

export async function POST(request: Request) {
  try {
    const actor = await requirePermission(
      "payments.create",
    );

    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return NextResponse.json(
        {
          error: "School access denied.",
        },
        {
          status: 403,
        },
      );
    }

    const body = await request.json();

    const studentId = Number(body.studentId);
    const amount = Number(body.amount);
    const method = String(body.method ?? "");
    const paymentDateString = String(
      body.paymentDate ?? "",
    );
    const reference = String(
      body.reference ?? "",
    );
    const description = String(
      body.description ?? "",
    );

    if (
      !Number.isInteger(studentId) ||
      studentId <= 0
    ) {
      return NextResponse.json(
        {
          error: "Please select a valid student.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          error:
            "Payment amount must be greater than zero.",
        },
        {
          status: 400,
        },
      );
    }

    if (!paymentDateString) {
      return NextResponse.json(
        {
          error: "Please select a payment date.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !PAYMENT_METHODS.includes(
        method as (typeof PAYMENT_METHODS)[number],
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Please select a valid payment method.",
        },
        {
          status: 400,
        },
      );
    }

    const paymentDate = new Date(
      `${paymentDateString}T12:00:00`,
    );

    if (Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        {
          error: "Please provide a valid payment date.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await createPayment({
      schoolId: school.id,
      studentId,
      cashierUserId: actor.id,
      amount,
      method: method as
        | "CASH"
        | "BANK_TRANSFER"
        | "POS"
        | "ONLINE"
        | "OTHER",
      paymentDate,
      reference,
      description,
    });

    return NextResponse.json(
      {
        success: true,
        paymentId: result.payment.id,
        receiptNumber:
          result.receipt.receiptNumber,
        balance: result.balance,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to record payment.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}