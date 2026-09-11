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
### 2. Academic Structure — PRACTICALLY COMPLETE
### 3. Students — PRACTICALLY COMPLETE
### 4. Staff & Teachers — IN REVIEW
### 5. Attendance — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW
### 6. Exams & Results — PRACTICALLY COMPLETE
### 7. Fees, Billing & Payments — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW
### 8. Communication — PRACTICALLY COMPLETE FOR CORE SCHOOL ANNOUNCEMENTS
### 9. Portals — IN REVIEW

### 10. Reports — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW

**Done / strong:**
- Academic results already assemble report-card data including student/class context, subject results, components, totals, grades, positions, attendance summary, and academic summary.
- Attendance summary and class-summary workflows provide useful operational reporting.
- Payment history/detail provides transparent payment, allocation, receipt, and balance information.
- Receipts can now be printed as a focused school receipt rather than only viewed inside the application.
- Printable receipts use the existing payment/allocation truth; no separate financial calculation or duplicate payment model was introduced.

**Still deferred / not a blocker:**
- Dedicated report-card print/export presentation can be improved later if real schools need a formal paper/PDF layout.
- Broader management dashboards/BI are intentionally not part of the current core reporting scope.

**Decision:** Group 10 is practically complete for the current 90% school workflow. Move to end-to-end verification rather than adding more reporting features.

### 11. Administration & Trust — PRACTICALLY COMPLETE FOR CURRENT CORE WORKFLOW

**Done / strong:**
- School-scoped audit history and administrative controls.
- Audit records use the authenticated user's school context.
- Logout audit no longer relies on the first school in the database.
- Sensitive session identifiers are not written into logout/unlock audit details.
- Permission-controlled administrative actions and user/role controls exist.

**Still deferred / not a blocker:**
- Additional hardening can be handled during end-to-end verification when a concrete failure is found.

**Decision:** Group 11 is substantially complete for the current core school workflow. Verify it through real user journeys rather than expanding administration into unnecessary complexity.

### 12. Platform / Operations — PRACTICALLY COMPLETE FOR CURRENT PRODUCT STAGE

**Done / strong:**
- Platform provisioning is separated from normal school operation.
- Provisioning is protected by a platform secret and validates organisation/application/school/owner context.
- Provisioning reuses the normal school-registration path instead of creating a second school-creation system.
- Demo deployment has a dedicated application/database boundary and a real-schema demo seed path.
- School branding configuration is implemented through the existing School model and applied to the application UI.

**Still deferred / not a blocker:**
- Full automated tenant/domain provisioning belongs to the wider platform layer.
- Public demo write-isolation/reset can be strengthened later with a disposable-session or reset mechanism.
- Production deployment hardening should be completed during final environment verification.

**Decision:** Group 12 is practically complete for the current product stage. Focus now on proving the whole school workflow end-to-end.

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
