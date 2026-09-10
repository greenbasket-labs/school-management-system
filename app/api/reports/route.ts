import { NextResponse } from "next/server";
import { requireAuth } from "../../../src/lib/authorization";
import { getSchool } from "../../../src/lib/school";
import {
  buildClassReport,
  buildFinancialReport,
  buildStudentReport,
  reportRowsToCsv,
  type ReportFilters,
} from "../../../src/lib/reporting";

function optionalInt(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function optionalDate(value: string | null) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuth();
    const school = await getSchool();

    if (!school || school.id !== actor.schoolId) {
      return NextResponse.json({ error: "School access denied." }, { status: 403 });
    }

    const url = new URL(request.url);
    const type = (url.searchParams.get("type") ?? "student").toLowerCase();
    const format = (url.searchParams.get("format") ?? "json").toLowerCase();

    if (!["student", "class", "financial"].includes(type)) {
      return NextResponse.json({ error: "Invalid report type." }, { status: 400 });
    }

    if (!["json", "csv"].includes(format)) {
      return NextResponse.json({ error: "Unsupported report format." }, { status: 400 });
    }

    const filters: ReportFilters = {
      sessionId: optionalInt(url.searchParams.get("sessionId")),
      termId: optionalInt(url.searchParams.get("termId")),
      classId: optionalInt(url.searchParams.get("classId")),
      studentId: optionalInt(url.searchParams.get("studentId")),
      subjectId: optionalInt(url.searchParams.get("subjectId")),
      status: url.searchParams.get("status") || undefined,
      from: optionalDate(url.searchParams.get("from")),
      to: optionalDate(url.searchParams.get("to")),
    };

    if (url.searchParams.get("from") && !filters.from) {
      return NextResponse.json({ error: "Invalid from date." }, { status: 400 });
    }
    if (url.searchParams.get("to") && !filters.to) {
      return NextResponse.json({ error: "Invalid to date." }, { status: 400 });
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      return NextResponse.json({ error: "from date must be before to date." }, { status: 400 });
    }

    const rows =
      type === "class"
        ? await buildClassReport(school.id, filters)
        : type === "financial"
          ? await buildFinancialReport(school.id, filters)
          : await buildStudentReport(school.id, filters);

    if (format === "csv") {
      return new Response(reportRowsToCsv(rows), {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${type}-report.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    return NextResponse.json(
      { success: true, type, count: rows.length, rows },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to generate report.";
    const status = message.includes("Authentication") ? 401 : message.includes("Permission denied") ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
