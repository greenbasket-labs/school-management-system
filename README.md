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

### 1. School & Organization — REVIEWED

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

**Still to decide / later:**
- Logo upload/management (schema has `logoUrl`, but the settings workflow does not yet provide complete logo management).
- Registration atomicity and additional deployment/onboarding hardening.
- Domain/tenant provisioning belongs to the wider platform/onboarding layer, not the core school workflow.

**Decision rule:** Do not add more School & Organization features unless a real school workflow needs them.

### 2. Academic Structure — NOT YET REVIEWED
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
