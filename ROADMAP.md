# School Management System — Product Roadmap

## 1. Product Target

Build a practical, production-ready school management system for private schools in Nigeria.

The goal is **not** to build the largest system or copy another product. The goal is to solve the real daily pain of the people who operate and use a school:

- School owners / administrators
- Teachers
- Students
- Parents / guardians
- Cashiers and other staff

The system should make school operations **simple, transparent, connected, and trustworthy**.

## 2. Core Product Principle

Most private schools have roughly the same core operations. Build that common 90% once, then make the remaining differences configurable rather than creating custom forks for each school.

### Every feature must pass these questions

1. **Who uses it?** Owner, admin, teacher, student, parent, cashier, or other staff.
2. **What real pain does it solve?** If the pain is unclear, do not build it yet.
3. **What is the simplest useful workflow?** Remove unnecessary steps.
4. **What should become transparent?** Users should not need to ask another person for information the system already knows.
5. **What genuinely needs configuration?** Configure real school differences; do not turn everything into settings.

### Avoid overbuilding

Prefer:

- Clear workflows over feature volume
- Useful dashboards over decorative dashboards
- One source of truth over duplicated information
- Automatic calculations over repeated manual work
- Audit/history where trust matters
- Configuration where schools genuinely differ
- Small, understandable modules over oversized systems

Do not add a feature merely because another school-management product has it.

## 3. What Success Looks Like

A real private school should be able to:

1. Set up the school.
2. Configure its academic structure and operating rules.
3. Register students and parents.
4. Manage teachers and other staff.
5. Run classes and subjects.
6. Mark and review attendance.
7. Define and assign fees.
8. Receive and correctly allocate payments.
9. See balances and financial history.
10. Run examinations and enter results.
11. Calculate grades/ranking according to school rules.
12. Approve and publish results.
13. Give parents/students useful portal access.
14. See reports and important items needing attention.
15. Close one academic session and prepare the next one without losing history.

The system should reduce unnecessary phone calls, paper chasing, manual calculations, duplicated entry, and uncertainty about what is happening in the school.

## 4. User Outcomes

### Owner / Administrator

Should be able to quickly understand:

- What is happening in the school
- Student and staff status
- Attendance issues
- Fee collection and outstanding balances
- Academic/result completion
- Important items requiring attention
- Historical activity and accountability

The owner should not need to inspect many unrelated pages just to understand the state of the school.

### Teacher

Should be able to quickly:

- See assigned classes/subjects
- Mark attendance
- Enter assessments/results
- Know what work is complete or missing
- Access the information needed to teach

### Student

Should be able to see:

- Current class and subjects
- Attendance
- Results/progress
- Relevant announcements
- Relevant financial information where applicable

### Parent / Guardian

Should be able to see:

- Child's attendance
- Child's academic performance
- Fees paid
- Outstanding balance
- Payment history
- Important school announcements

Basic information should not require calling the school.

### Cashier / Other Staff

Should be able to complete assigned work quickly, with clear permissions and an audit trail where appropriate.

## 5. Roadmap / Module Order

The following is the working roadmap. It is a guide, not permission to overbuild every module.

### GROUP 1 — School & Organization

- School profile
- School settings
- Users
- Roles and permissions
- Core school configuration

### GROUP 2 — Academic Structure

- Academic sessions
- Terms
- Classes
- Arms / sections
- Subjects
- Class-subject relationships
- Session lifecycle

### GROUP 3 — Student Management

- Student registration
- Student profiles
- Parents / guardians
- Student-class history
- Student lifecycle
- Promotion
- Repeat
- Transfer
- Withdrawal
- Graduation
- Student rollover

### GROUP 4 — Staff

- Teachers
- Other staff
- Staff roles/permissions
- Staff attendance
- Staff lifecycle as needed

### GROUP 5 — Attendance

- Student attendance
- Staff attendance
- Corrections
- Useful attendance reports
- Attendance configuration

### GROUP 6 — Examinations & Results

- Exams
- Subjects
- Assessment components
- Result entry
- Calculation
- Grading
- Ranking
- Approval
- Publishing
- Term-level result/report card workflow

### GROUP 7 — Fees, Billing & Payments

- Fee structure
- Fee assignments
- Payments
- Payment allocation
- Student financial summary
- Student statements
- Financial reports
- Fee rollover
- Payment plans / installments
- Outstanding balance handling
- Payment correction/refund/cancellation workflow

### GROUP 8 — Communication

- Announcements
- Relevant parent/student communication
- Notifications where they solve a real problem

### GROUP 9 — Portals

- Parent portal
- Student portal
- Staff portal where useful

### GROUP 10 — Reports

- Academic reports
- Attendance reports
- Financial reports
- Student reports
- Staff reports
- Management/owner summaries

### GROUP 11 — Administration & Trust

- Audit history
- Security
- User management
- School configuration
- System settings

### GROUP 12 — Green Basket Global Platform Layer

The School Management System is the operating engine. Green Basket Global provides the commercial/company layer around it:

- School discovery/onboarding
- Service setup
- Commercial/subscription layer
- School provisioning
- Configuration support
- Customer support

Keep the company/platform layer separate from the school operating engine where appropriate.

## 6. Current Development State

This repository already contains substantial work across academic sessions, student lifecycle, attendance, examinations/results, finance, portals, users/roles, audit, and configuration.

### Strong foundations already built

- Academic session lifecycle
- Session rollover foundation
- Student lifecycle actions
- Student rollover review
- Configurable academic calculation/grading foundation
- Exam and assessment workflows
- Student/staff attendance foundations
- Fee/payment foundations
- Payment allocation
- Financial summary/reporting foundations
- Fee rollover foundation
- Payment-plan calculation engine
- Controlled payment correction foundation (refund/cancel with reason, owner/admin control, preserved original payment and audit history)
- Portal foundations
- Audit logging
- School feature/configuration foundation

### Finance hardening completed in the current pass

- Payment allocation is part of the real payment workflow.
- Financial reports use allocation-based collection figures.
- Filtered financial reports calculate unallocated credit against the complete allocation history of each selected payment.
- Payment details clearly distinguish historical allocations from allocations that currently affect the student's balance after refund/cancellation.
- Payment correction preserves the original payment record and removes its financial effect from current balances through status handling.

### Areas still requiring completion or production hardening

- Complete report-card / term-result workflow
- Finish and integrate payment plans/installments at the database/workflow level
- Finish production hardening of attendance settings/automation where genuinely needed
- End-to-end finance verification with real-school scenarios
- Verify portal workflows end-to-end
- Improve activation/readiness checks where needed
- Resolve existing TypeScript/build issues before treating the repository as production-ready
- Test complete real-school workflows rather than only individual functions/pages

## 7. Current Priority

**Finish GROUP 7 — Fees, Billing & Payments without overbuilding it.**

Working sequence:

1. Fee Structure
2. Fee Assignment
3. Payment
4. Payment Allocation
5. Student Financial Summary
6. Student Statement
7. Financial Reports
8. Fee Rollover
9. Payment Correction / Refund / Cancellation
10. Payment Plans / Installments
11. End-to-end finance verification

The next finance step is **Payment Plans / Installments**, followed by a focused end-to-end finance verification. After that, move to the next highest-value unfinished school pain area.

## 8. Development Method

For each area:

**Audit → Identify real gap → Design the smallest useful solution → Implement → Verify → Move on.**

Before changing code:

- Inspect the actual repository state.
- Understand existing models/workflows.
- Avoid duplicating functionality that already exists.
- Avoid changing unrelated modules.
- Preserve historical data and auditability where the domain requires it.
- Prefer configuration-driven behavior when schools genuinely differ.

After changes:

- Verify the affected workflow.
- Run appropriate type/build checks.
- Review the actual diff.
- Commit a focused change.
- Do not claim a change is complete until it has been verified.

## 9. Data & Trust Principles

The system should maintain a trustworthy history.

Examples:

- A payment is money actually received.
- A payment allocation explains where that money was applied.
- A fee assignment represents what was charged.
- A rollover should not silently destroy historical financial or academic information.
- Important lifecycle changes should be auditable.
- Published academic information should have a clear status/history.
- A corrected payment should keep its original record and status history rather than being edited or deleted.
- Refunded/cancelled payments must not continue reducing the student's current outstanding balance.

When there is a choice between a convenient shortcut and preserving trustworthy history, preserve the history.

## 10. Definition of a Good Feature

A feature is good when it makes a real school task:

- Faster
- Easier
- Clearer
- Less error-prone
- More transparent
- More accountable

A feature is **not** good merely because it adds another page, table, setting, report, or technical capability.

## 11. Final Product Vision

The system should feel like one connected school operating system:

**School setup**
→ **Academic structure**
→ **Students & staff**
→ **Attendance**
→ **Fees & payments**
→ **Exams & results**
→ **Parents/students**
→ **Reports & management**
→ **Next academic session**

Everyone should see the information relevant to them, do their work with minimal friction, and trust that the system reflects what is actually happening in the school.

**Build what schools really need. Keep it simple. Make it transparent. Do not overbuild.**
