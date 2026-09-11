# School Management System

A practical, configuration-driven School Management System for private schools in Nigeria.

## Product Principle

Build what schools really need. Keep it simple, transparent, connected, and trustworthy.

Most private schools share the same core operations. The system targets that common 90% and uses configuration for genuine differences instead of unnecessary custom versions.

## Development Roadmap

We do **not** require every area to reach 100% before moving forward.

For each group:
1. Audit what exists.
2. Identify real operational gaps.
3. Fix must-have gaps.
4. Mark useful-but-later work as deferred.
5. Leave unnecessary/overbuilt ideas out.
6. Verify the workflow.
7. Move to the next group.

A group is practically complete when a real school can use its important workflow safely and consistently. Later improvements can be added without blocking progress.

## Group Status

### 1. School & Organization — PRACTICALLY COMPLETE

**Done / strong:**
- School registration creates the initial school and Owner account.
- School identity/settings: name, motto, address, phone, email, website, principal/head, registration information.
- School settings require `school.view` / `school.edit` permissions.
- School updates are audited.
- Current-user resolution follows the authenticated user's `schoolId`, rather than blindly selecting the first school.
- Dashboard and portal school context follow the authenticated user's school.
- Permission checks reject missing/inactive users.
- User uniqueness is scoped by school for username, email, and phone.
- The data model supports multiple schools.

**Still deferred / not a blocker:**
- Logo upload/management (schema has `logoUrl`, but the settings workflow does not yet provide complete logo management).
- Registration atomicity and additional deployment/onboarding hardening.
- Domain/tenant provisioning belongs to the wider platform/onboarding layer, not the core school workflow.

**Decision:** Group 1 is complete enough for the real-school workflow. Do not add more here unless a real operational need appears.

### 2. Academic Structure — PRACTICALLY COMPLETE

**Done / strong:**
- Academic sessions can be created per school with name, start date, end date, and DRAFT status.
- Sessions have an explicit lifecycle: DRAFT → ACTIVE → COMPLETED → ARCHIVED.
- Activation checks academic readiness and prevents multiple active sessions for the same school.
- Session completion and archival require a reason and are audited.
- Terms support First, Second, and Third Term.
- Terms have names, dates, and active/inactive state.
- Only one active term is maintained within a session.
- Classes are linked to an academic session and school.
- Classes support name, section, class teacher, and active/inactive status.
- Duplicate class name + section is prevented within the same school/session.
- Subjects are school-scoped and support lookup/search/active filtering.
- Class-subject assignments prevent duplicate subject assignments and validate school/teacher ownership and teacher status.
- Academic-session rollover and readiness foundations connect the academic structure to the next-session workflow.

**Must-fix completed in this review:**
- Terms can no longer be added to COMPLETED or ARCHIVED sessions.
- Term dates must stay inside the academic-session dates.
- Term dates cannot overlap another term in the same session.
- Classes can no longer be created against COMPLETED or ARCHIVED sessions.

**Still deferred / not a blocker:**
- More advanced academic structure such as streams/programs, departments, campuses, houses, or timetable-specific structures.
- Rich term editing/lifecycle UI beyond the current operational needs.
- Additional database-level uniqueness/transaction hardening where the current application validation is sufficient for now.

**Decision:** Group 2 is practically complete for the common 90% school workflow. Move forward rather than overbuilding academic configuration.

### 3. Students — PRACTICALLY COMPLETE

**Done / strong:**
- Student registration and permanent school IDs.
- Student profiles and editable core information.
- School-scoped student access and profile validation.
- Current class assignment with StudentClassHistory.
- Student lifecycle: PROMOTE, REPEAT, TRANSFER, WITHDRAW, GRADUATE.
- Parent/guardian linking with relationship and primary-guardian support.
- Lifecycle actions preserve class history and are auditable.
- Rollover preparation supports promotion/repeat/terminal decisions.
- Class assignment validates student, class, school, and academic-session boundaries.

**Must-fix completed in this review:**
- Student registration now validates the selected class against the authenticated user's school and active academic session before creating the student/class relationship.
- Teacher/student-related school context no longer relies on the first school in the database.

**Still deferred / not a blocker:**
- Bulk import/export.
- Student photo/document management.
- Advanced admissions workflows.
- Transactional hardening for high-concurrency ID generation.

**Decision:** Group 3 is practically complete for the common 90% school workflow. Move forward rather than overbuilding student management.

### 4. Staff & Teachers — IN REVIEW

**Done / strong:**
- Teacher directory and school-scoped teacher lookup.
- Teacher registration with permanent IDs and duplicate phone/email checks.
- Teacher active/inactive status.
- Class-subject assignments can reference active teachers and validate school ownership.
- Staff attendance supports OWNER, ADMIN, TEACHER, CASHIER, and STAFF users.
- Staff check-in/check-out, lateness calculation, missed-checkout flag, correction fields, and audit records exist.
- Staff attendance settings support start time, grace period, closing time, checkout requirement, and missed-checkout behavior.
- Current-user and school context hardening is in place for staff-facing workflows.

**Must-fix completed in this review:**
- Teacher creation now derives school ownership from the authenticated user instead of selecting the first school in the database.
- Teacher permanent-ID sequencing is scoped to the authenticated school.
- Teacher creation audit records now identify the authenticated actor.

**Still under review:**
- General staff account lifecycle beyond teachers.
- Teacher-to-user account provisioning and deactivation linkage.
- Staff attendance settings being consumed consistently by the attendance engine.
- Automatic missed-checkout processing and timezone behavior.

**Decision:** Continue focused review, but do not expand into HR/payroll or unnecessary staff-management features.

### 5. Attendance — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW

**Done / strong:**
- Student attendance supports configurable one- or two-call daily attendance.
- Attendance marking/edit permissions are enforced.
- Student/class/school boundaries are validated.
- Duplicate attendance entries are prevented unless explicitly editing.
- Attendance records use robust persisted timestamps and are audited.
- Staff attendance is intentionally lightweight and optional: check-in/check-out rather than a compulsory HR attendance system.

**Still deferred / not a blocker:**
- Full staff attendance administration/monitoring.
- Automatic missed-checkout processing.
- Additional timezone hardening.

**Decision:** Keep attendance simple and useful for the common school workflow. Do not turn teacher/staff attendance into an overbuilt payroll/HR subsystem.

### 6. Exams & Results — PRACTICALLY COMPLETE

**Done / strong:**
- Exam creation and academic-context validation.
- Exam subjects and configurable assessment components.
- Result entry with component/max-mark validation and automatic totals.
- Configurable grading and ranking calculations.
- Result workflow: DRAFT → FINAL → PUBLISHED with appropriate approval/publish permissions.
- Published results are protected from ordinary editing.
- Subject, class, and school ranking calculations.
- Report-card workflow with academic and attendance summaries.
- School-scoped access and audit controls across the result workflow.

**Still deferred / not a blocker:**
- Additional advanced grading/ranking variations beyond the current configurable engine.
- Further reporting/print enhancements can be handled in Group 10.

**Decision:** Group 6 is practically complete for the common 90% school examination workflow. Do not add complexity unless a real school need appears.

### 7. Fees, Billing & Payments — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW

**Done / strong:**
- Fee types and school-scoped fee assignments.
- Student financial summaries based on actual completed payment allocations.
- Cashier payment workflow with school/permission/student validation.
- Automatic allocation of payments against outstanding fees.
- Automatic receipt generation.
- Payment history and payment detail transparency.
- Refund/cancellation correction workflow with reasons and audit history.
- Fee rollover with controlled carry/transfer decisions.
- Financial reporting distinguishes allocated payments from unallocated credit.
- Cashier-facing balances now follow the same allocation-based financial truth as the payment engine.

**Deferred / planned:**
- Payment Plans / installments require the later Prisma/PowerShell schema work already agreed. Do not implement a half-schema version.
- Minimal transparent staff compensation/salary payment workflow will be added as planned finance functionality, without building enterprise payroll.

**Known architectural cleanup:**
- `src/lib/fees.ts` contains a legacy/duplicate payment creation helper, but the live cashier API uses `src/lib/payments.ts`. No risky refactor is required before moving forward; consolidate only when it provides a clear maintenance benefit.

**Decision:** Group 7 is practically complete for the current core school finance workflow. Move forward while keeping Payment Plans and minimal staff pay as explicit planned work.

### 8. Communication — PRACTICALLY COMPLETE FOR CORE SCHOOL ANNOUNCEMENTS

**Done / strong:**
- School announcements can be created, edited, published, unpublished, and deleted.
- Announcement audience can be targeted at everyone, students, parents, or teachers.
- Published announcements are surfaced in the relevant student, parent, and teacher portals according to audience.
- Announcement creation, editing, publication, unpublication, and deletion are audited.
- Communication access is permission-controlled.
- Announcement data is school-scoped through the authenticated user's school context.

**Still deferred / not a blocker:**
- Direct/private messaging between school staff, teachers, parents, and students is not implemented as a separate messaging system.
- Email/SMS/push delivery integrations are not required for the current core workflow.
- Advanced audience targeting and scheduled/broadcast campaigns can be added later if real schools require them.

**Decision:** Group 8 is practically complete for the common 90% communication need: reliable school announcements visible to the correct portal audience. Do not build a full messaging/notification platform yet.

### 9. Portals — NOT YET REVIEWED
### 10. Reports — NOT YET REVIEWED
### 11. Administration & Trust — NOT YET REVIEWED
### 12. Platform / Operations — NOT YET REVIEWED

## Working Method

**Audit → Real Gap → Smallest Useful Solution → Implement → Verify → Document → Move On**

Do not modify code merely to make a checklist look complete.

## Current Product Direction

The target is a real private school being able to run its important daily operations through the system, including:
- School setup
- Academic sessions and terms
- Student and parent management
- Staff and teachers
- Classes and subjects
- Attendance
- Fees and payments
- Exams and results
- Parent/student/teacher portals
- Reports
- Communication
- Audit and administrative controls

The system should preserve history, make financial and academic information transparent, and avoid destructive shortcuts.

## Important Development Note

This README is a living product-status document. Update it when a meaningful group is reviewed, completed, deferred, or when an important architectural/product decision changes.
