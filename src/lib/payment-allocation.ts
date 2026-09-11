export type PaymentAllocationStrategy =
  | "OLDEST_DUE"
  | "OLDEST_ASSIGNMENT";

export type PaymentAllocationCandidate = {
  feeAssignmentId: number;
  studentId: number;
  schoolId: number;
  amount: number;
  allocatedAmount?: number;
  dueDate?: Date | string | null;
  createdAt?: Date | string | null;
  status: "ACTIVE" | "WAIVED" | "CANCELLED";
};

export type PaymentAllocationRequest = {
  feeAssignmentId: number;
  amount: number;
};

export type CalculatedPaymentAllocation = {
  feeAssignmentId: number;
  amount: number;
};

export type PaymentAllocationResult = {
  allocations: CalculatedPaymentAllocation[];
  allocatedAmount: number;
  unallocatedAmount: number;
};

function toCents(amount: number, field: string) {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${field} must be a valid non-negative amount.`);
  }

  return Math.round(amount * 100);
}

function fromCents(amount: number) {
  return amount / 100;
}

function requirePositiveCents(amount: number, field: string) {
  const cents = toCents(amount, field);

  if (cents <= 0) {
    throw new Error(`${field} must be greater than zero.`);
  }

  return cents;
}

function toTime(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "string") {
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

function sortCandidates(
  candidates: PaymentAllocationCandidate[],
  strategy: PaymentAllocationStrategy,
) {
  return [...candidates].sort((a, b) => {
    if (strategy === "OLDEST_DUE") {
      const aDue = toTime(a.dueDate);
      const bDue = toTime(b.dueDate);

      if (aDue !== bDue) {
        return aDue - bDue;
      }
    }

    const aCreated = toTime(a.createdAt);
    const bCreated = toTime(b.createdAt);

    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    return a.feeAssignmentId - b.feeAssignmentId;
  });
}

function validateCandidates(
  candidates: PaymentAllocationCandidate[],
) {
  const seen = new Set<number>();

  for (const candidate of candidates) {
    if (!Number.isInteger(candidate.feeAssignmentId) || candidate.feeAssignmentId <= 0) {
      throw new Error("Invalid fee assignment ID.");
    }

    if (!Number.isInteger(candidate.studentId) || candidate.studentId <= 0) {
      throw new Error("Invalid student ID.");
    }

    if (!Number.isInteger(candidate.schoolId) || candidate.schoolId <= 0) {
      throw new Error("Invalid school ID.");
    }

    if (seen.has(candidate.feeAssignmentId)) {
      throw new Error(
        "A fee assignment can only appear once in allocation candidates.",
      );
    }

    seen.add(candidate.feeAssignmentId);

    const amountCents = toCents(candidate.amount, "Fee assignment amount");
    const allocatedCents = toCents(
      candidate.allocatedAmount ?? 0,
      "Allocated amount",
    );

    if (allocatedCents > amountCents) {
      throw new Error(
        `Existing allocation exceeds fee assignment ${candidate.feeAssignmentId}.`,
      );
    }
  }
}

export function calculatePaymentAllocation(input: {
  paymentAmount: number;
  studentId: number;
  schoolId: number;
  candidates: PaymentAllocationCandidate[];
  strategy?: PaymentAllocationStrategy;
  requestedAllocations?: PaymentAllocationRequest[];
}): PaymentAllocationResult {
  const paymentCents = requirePositiveCents(
    input.paymentAmount,
    "Payment amount",
  );

  if (!Number.isInteger(input.studentId) || input.studentId <= 0) {
    throw new Error("Invalid student ID.");
  }

  if (!Number.isInteger(input.schoolId) || input.schoolId <= 0) {
    throw new Error("Invalid school ID.");
  }

  validateCandidates(input.candidates);

  const eligible = input.candidates.filter(
    (candidate) =>
      candidate.schoolId === input.schoolId &&
      candidate.studentId === input.studentId &&
      candidate.status === "ACTIVE",
  );

  const candidateById = new Map(
    eligible.map((candidate) => [candidate.feeAssignmentId, candidate]),
  );

  const remainingById = new Map(
    eligible.map((candidate) => [
      candidate.feeAssignmentId,
      toCents(candidate.amount, "Fee assignment amount") -
        toCents(candidate.allocatedAmount ?? 0, "Allocated amount"),
    ]),
  );

  const allocations: CalculatedPaymentAllocation[] = [];
  let remainingPayment = paymentCents;

  if (input.requestedAllocations) {
    const requestedIds = new Set<number>();

    for (const request of input.requestedAllocations) {
      const candidate = candidateById.get(request.feeAssignmentId);

      if (!candidate) {
        throw new Error(
          `Fee assignment ${request.feeAssignmentId} is not an active assignment for this student.`,
        );
      }

      if (requestedIds.has(request.feeAssignmentId)) {
        throw new Error(
          `Fee assignment ${request.feeAssignmentId} was allocated more than once.`,
        );
      }

      requestedIds.add(request.feeAssignmentId);

      const requestedCents = requirePositiveCents(
        request.amount,
        "Requested allocation amount",
      );

      const outstandingCents =
        remainingById.get(request.feeAssignmentId) ?? 0;

      if (requestedCents > outstandingCents) {
        throw new Error(
          `Allocation for fee assignment ${request.feeAssignmentId} exceeds its outstanding balance.`,
        );
      }

      if (requestedCents > remainingPayment) {
        throw new Error(
          "Requested allocations exceed the payment amount.",
        );
      }

      allocations.push({
        feeAssignmentId: request.feeAssignmentId,
        amount: fromCents(requestedCents),
      });

      remainingPayment -= requestedCents;
    }
  } else {
    const strategy = input.strategy ?? "OLDEST_DUE";
    const ordered = sortCandidates(eligible, strategy);

    for (const candidate of ordered) {
      if (remainingPayment <= 0) {
        break;
      }

      const outstandingCents =
        remainingById.get(candidate.feeAssignmentId) ?? 0;

      if (outstandingCents <= 0) {
        continue;
      }

      const allocationCents = Math.min(
        remainingPayment,
        outstandingCents,
      );

      allocations.push({
        feeAssignmentId: candidate.feeAssignmentId,
        amount: fromCents(allocationCents),
      });

      remainingPayment -= allocationCents;
    }
  }

  const allocatedCents = paymentCents - remainingPayment;

  return {
    allocations,
    allocatedAmount: fromCents(allocatedCents),
    unallocatedAmount: fromCents(remainingPayment),
  };
}
