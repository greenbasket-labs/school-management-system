import { db } from "../prisma/db";
import { hasPermission } from "./permissions";
import { writeAuditLog } from "./audit";

export type PaymentCorrectionAction = "REFUND" | "CANCEL";

function requireValidId(value: number, field: string) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${field}.`);
  }
}

function requireReason(reason: string) {
  const normalized = reason.trim();
  if (normalized.length < 5) {
    throw new Error("A correction reason of at least 5 characters is required.");
  }
  if (normalized.length > 500) {
    throw new Error("Correction reason is too long.");
  }
  return normalized;
}

/**
 * Correct a completed payment without editing or deleting its original record.
 *
 * Refunded/cancelled payments remain in history. Financial summaries exclude
 * them because only COMPLETED payments count toward the student's balance.
 * The actual return of money for a refund happens outside this system.
 */
export async function correctPayment(input: {
  schoolId: number;
  paymentId: number;
  actorUserId: number;
  action: PaymentCorrectionAction;
  reason: string;
}) {
  requireValidId(input.schoolId, "school ID");
  requireValidId(input.paymentId, "payment ID");
  requireValidId(input.actorUserId, "actor user ID");

  const allowed = await hasPermission(input.actorUserId, "payments.create");
  if (!allowed) {
    throw new Error("You do not have permission to correct payments.");
  }

  const users = await db.orm.public.User.all();
  const actor = users.find(
    (user) =>
      user.id === input.actorUserId &&
      user.schoolId === input.schoolId &&
      user.status === "ACTIVE",
  );

  if (!actor) {
    throw new Error("Correction user is not active in this school.");
  }

  if (actor.userType !== "OWNER" && actor.userType !== "ADMIN") {
    throw new Error("Only an owner or administrator can correct a payment.");
  }

  const reason = requireReason(input.reason);

  const payments = await db.orm.public.Payment.all();
  const payment = payments.find(
    (item) => item.id === input.paymentId && item.schoolId === input.schoolId,
  );

  if (!payment) {
    throw new Error("Payment not found in this school.");
  }

  if (payment.status !== "COMPLETED") {
    throw new Error(`This payment is already ${payment.status.toLowerCase()} and cannot be corrected again.`);
  }

  const nextStatus = input.action === "REFUND" ? "REFUNDED" : "CANCELLED";

  const updated = await db.orm.public.Payment.where({ id: payment.id }).update({
    status: nextStatus,
  });

  await writeAuditLog({
    schoolId: input.schoolId,
    userId: input.actorUserId,
    action: input.action,
    entity: "Payment",
    entityId: payment.id,
    oldValue: {
      status: payment.status,
      amount: Number(payment.amount),
    },
    newValue: {
      status: nextStatus,
      amount: Number(payment.amount),
      reason,
    },
  });

  return {
    payment: updated,
    previousStatus: payment.status,
    status: nextStatus,
    reason,
  };
}
