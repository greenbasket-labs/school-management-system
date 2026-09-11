export type PaymentPlanType = "FULL" | "PARTIAL" | "INSTALLMENT" | "CUSTOM";

export type PaymentPlanStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type PaymentInstallmentInput = {
  name: string;
  amount: number;
  dueDate: Date;
};

export type CalculatedInstallment = PaymentInstallmentInput & {
  sequence: number;
};

export type PaymentPlanCalculation = {
  planType: PaymentPlanType;
  totalAmount: number;
  installments: CalculatedInstallment[];
};

export type PaymentPlanSummary = {
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentPlanStatus;
};

function cents(value: number) {
  if (!Number.isFinite(value) || value < 0) throw new Error("Amount must be a valid non-negative number.");
  return Math.round(value * 100);
}

function money(value: number) {
  return Math.round(value) / 100;
}

function requireDate(value: Date, field: string) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new Error(`${field} must be a valid date.`);
}

export function calculatePaymentPlan(input: {
  totalAmount: number;
  planType: PaymentPlanType;
  dueDate?: Date;
  installmentCount?: number;
  firstDueDate?: Date;
  installmentIntervalDays?: number;
  customInstallments?: PaymentInstallmentInput[];
}): PaymentPlanCalculation {
  const totalCents = cents(input.totalAmount);
  if (totalCents <= 0) throw new Error("Payment plan amount must be greater than zero.");

  if (input.planType === "FULL") {
    if (!input.dueDate) throw new Error("A due date is required for a full payment plan.");
    requireDate(input.dueDate, "Due date");
    return {
      planType: input.planType,
      totalAmount: money(totalCents),
      installments: [{ name: "Full payment", amount: money(totalCents), dueDate: input.dueDate, sequence: 1 }],
    };
  }

  if (input.planType === "PARTIAL") {
    return { planType: input.planType, totalAmount: money(totalCents), installments: [] };
  }

  if (input.planType === "INSTALLMENT") {
    const count = input.installmentCount ?? 0;
    if (!Number.isInteger(count) || count < 2 || count > 60) throw new Error("Installment count must be between 2 and 60.");
    if (!input.firstDueDate) throw new Error("A first due date is required for installments.");
    requireDate(input.firstDueDate, "First due date");
    const interval = input.installmentIntervalDays ?? 30;
    if (!Number.isInteger(interval) || interval < 1 || interval > 366) throw new Error("Installment interval must be between 1 and 366 days.");

    const base = Math.floor(totalCents / count);
    const remainder = totalCents - base * count;
    const installments = Array.from({ length: count }, (_, index) => ({
      name: `Installment ${index + 1}`,
      amount: money(base + (index < remainder ? 1 : 0)),
      dueDate: new Date(input.firstDueDate!.getTime() + index * interval * 86400000),
      sequence: index + 1,
    }));
    return { planType: input.planType, totalAmount: money(totalCents), installments };
  }

  if (!input.customInstallments?.length) throw new Error("At least one custom installment is required.");
  const custom = input.customInstallments.map((item, index) => {
    const amount = cents(item.amount);
    if (amount <= 0) throw new Error(`Custom installment ${index + 1} must be greater than zero.`);
    requireDate(item.dueDate, `Custom installment ${index + 1} due date`);
    const name = item.name.trim();
    if (!name) throw new Error(`Custom installment ${index + 1} requires a name.`);
    return { name, amount, dueDate: item.dueDate, sequence: index + 1 };
  });
  const customTotal = custom.reduce((sum, item) => sum + item.amount, 0);
  if (customTotal !== totalCents) throw new Error("Custom installment amounts must equal the total fee amount.");

  return {
    planType: input.planType,
    totalAmount: money(totalCents),
    installments: custom.map((item) => ({ ...item, amount: money(item.amount) })),
  };
}

export function getInstallmentStatus(input: {
  amount: number;
  paidAmount: number;
  dueDate: Date;
  asOf?: Date;
}) {
  const amountCents = cents(input.amount);
  const paidCents = Math.min(amountCents, cents(input.paidAmount));
  const asOf = input.asOf ?? new Date();
  requireDate(input.dueDate, "Due date");
  requireDate(asOf, "As-of date");

  if (paidCents >= amountCents) return "PAID" as const;
  if (paidCents > 0) return asOf.getTime() > input.dueDate.getTime() ? "OVERDUE_PARTIAL" as const : "PARTIAL" as const;
  return asOf.getTime() > input.dueDate.getTime() ? "OVERDUE" as const : "PENDING" as const;
}

export function summarizePaymentPlan(input: {
  totalAmount: number;
  paidAmount: number;
  status?: PaymentPlanStatus;
}): PaymentPlanSummary {
  const totalCents = cents(input.totalAmount);
  const paidCents = Math.min(totalCents, cents(input.paidAmount));
  const outstandingCents = totalCents - paidCents;

  if (input.status === "CANCELLED") {
    return {
      totalAmount: money(totalCents),
      paidAmount: money(paidCents),
      outstandingAmount: money(outstandingCents),
      status: "CANCELLED",
    };
  }

  return {
    totalAmount: money(totalCents),
    paidAmount: money(paidCents),
    outstandingAmount: money(outstandingCents),
    status: outstandingCents === 0 ? "COMPLETED" : "ACTIVE",
  };
}
