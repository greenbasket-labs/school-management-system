import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import { db } from "../../../src/prisma/db";
import PaymentForm from "./payment-form";

type StudentOption = {
  id: number;
  permanentId: string;
  name: string;
  balance: number;
};

type NewPaymentPageProps = {
  searchParams: Promise<{
    studentId?: string;
  }>;
};

export default async function NewPaymentPage({
  searchParams,
}: NewPaymentPageProps) {
  const user = await requirePermission(
    "payments.create",
  );

  const school = await getSchool();

  if (!school || school.id !== user.schoolId) {
    redirect("/dashboard");
  }

  const params = await searchParams;

  const requestedStudentId = Number(
    params.studentId,
  );

  const selectedStudentId =
    Number.isInteger(requestedStudentId) &&
    requestedStudentId > 0
      ? requestedStudentId
      : null;

  const [
    students,
    assignments,
    payments,
    paymentAllocations,
  ] = await Promise.all([
    db.orm.public.Student.all(),
    db.orm.public.FeeAssignment.all(),
    db.orm.public.Payment.all(),
    db.orm.public.PaymentAllocation.all(),
  ]);

  const schoolStudents = students
    .filter(
      (student) =>
        student.schoolId === school.id &&
        student.status === "ACTIVE",
    )
    .sort((a, b) =>
      a.lastName.localeCompare(b.lastName),
    );

  const schoolAssignments = assignments.filter(
    (assignment) =>
      assignment.schoolId === school.id &&
      assignment.status === "ACTIVE",
  );

  const completedPaymentIds = new Set(
    payments
      .filter(
        (payment) =>
          payment.schoolId === school.id &&
          payment.status === "COMPLETED",
      )
      .map((payment) => payment.id),
  );

  const allocatedByStudent = new Map<number, number>();

  for (const allocation of paymentAllocations) {
    if (
      allocation.schoolId !== school.id ||
      !completedPaymentIds.has(allocation.paymentId)
    ) {
      continue;
    }

    const current = allocatedByStudent.get(allocation.studentId) ?? 0;
    allocatedByStudent.set(
      allocation.studentId,
      current + Number(allocation.amount),
    );
  }

  const studentOptions: StudentOption[] =
    schoolStudents.map((student) => {
      const totalFees = schoolAssignments
        .filter(
          (assignment) =>
            assignment.studentId === student.id,
        )
        .reduce(
          (total, assignment) =>
            total + Number(assignment.amount),
          0,
        );

      const totalPaid = allocatedByStudent.get(student.id) ?? 0;

      return {
        id: student.id,
        permanentId: student.permanentId,
        name: `${student.firstName} ${
          student.middleName
            ? `${student.middleName} `
            : ""
        }${student.lastName}`,
        balance: Math.max(0, totalFees - totalPaid),
      };
    });

  const validSelectedStudentId =
    selectedStudentId !== null &&
    studentOptions.some(
      (student) =>
        student.id === selectedStudentId,
    )
      ? selectedStudentId
      : null;

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/cashier"
            className="text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            ← Cashier
          </Link>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Record Payment
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Record a student payment and automatically
            generate its receipt.
          </p>
        </div>

        <PaymentForm
          students={studentOptions}
          today={today}
          selectedStudentId={validSelectedStudentId}
        />
      </div>
    </main>
  );
}