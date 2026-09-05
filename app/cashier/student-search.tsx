"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Student = {
  id: number;
  permanentId: string;
  name: string;
  phone: string | null;
  className: string;
  totalFees: number;
  totalPaid: number;
  balance: number;
};

type StudentSearchProps = {
  students: Student[];
  canCreatePayment: boolean;
};

function formatMoney(value: number) {
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function StudentSearch({
  students,
  canCreatePayment,
}: StudentSearchProps) {
  const [query, setQuery] = useState("");

  const filteredStudents = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    return students
      .filter((student) => {
        const name = student.name.toLowerCase();
        const permanentId = student.permanentId.toLowerCase();
        const phone = (student.phone ?? "").toLowerCase();
        const className = student.className.toLowerCase();

        return (
          name.includes(normalized) ||
          permanentId.includes(normalized) ||
          phone.includes(normalized) ||
          className.includes(normalized)
        );
      })
      .slice(0, 10);
  }, [query, students]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-5">
        <h2 className="text-lg font-semibold text-slate-900">
          Find Student
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Search by student name, permanent ID, phone number, or class.
        </p>
      </div>

      <div className="p-6">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search student..."
          autoComplete="off"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
        />

        {query.trim() && filteredStudents.length === 0 && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">
            No student found.
          </div>
        )}

        {filteredStudents.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <div className="divide-y divide-slate-100">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">
                      {student.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {student.permanentId}
                      {student.className
                        ? ` • ${student.className}`
                        : ""}
                    </p>

                    {student.phone && (
                      <p className="mt-1 text-xs text-slate-500">
                        {student.phone}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        Balance
                      </p>

                      <p className="font-semibold text-slate-900">
                        {formatMoney(student.balance)}
                      </p>
                    </div>

                    {canCreatePayment && student.balance > 0 && (
                      <Link
                        href={`/payments/new?studentId=${student.id}`}
                        className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                      >
                        Select
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!query.trim() && (
          <p className="mt-4 text-sm text-slate-400">
            Start typing to find a student.
          </p>
        )}
      </div>
    </section>
  );
}