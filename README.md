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

### 2. Academic Structure — REVIEWED

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

### 3. Students — NOT YET REVIEWED
### 4. Staff — NOT YET REVIEWED
### 5. Attendance — NOT YET REVIEWED
### 6. Exams & Results — NOT YET REVIEWED
### 7. Fees, Billing & Payments — IN PROGRESS
### 8. Communication — NOT YET REVIEWED
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
