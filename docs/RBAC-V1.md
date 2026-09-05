\# RBAC V1 — Roles \& Permissions



\## Purpose



The School Management System uses Role-Based Access Control (RBAC) to control what each user can do inside the school.



The system separates:



\- User Type

\- Role

\- Permission



User Type identifies the category of account/person.



Role determines the access bundle assigned to the user.



Permission defines an individual action the user is allowed to perform.



Permanent ID is independent of both User Type and Role and must never change because of a User Type or Role change.



\---



\# 1. Authorization Structure



User

→ UserRole

→ Role

→ RolePermission

→ Permission



A user may have one or more roles.



A role contains one or more permissions.



A permission represents one specific capability.



\---



\# 2. User Type vs Role



\## User Type



User Type represents the person's/account category.



Supported V1 User Types:



\- ADMIN

\- TEACHER

\- CASHIER

\- STUDENT

\- PARENT

\- STAFF



Future system extensions may add other types.



\## Role



Role represents the access level.



Default V1 system roles:



\- Owner

\- Administrator

\- Teacher

\- Cashier

\- Student

\- Parent

\- Staff



A User Type may change without changing the Permanent ID.



Example:



User Type:

TEACHER → ADMIN



Permanent ID:



TEA-2026-00001



The Permanent ID remains unchanged.



\---



\# 3. System Roles



\## Owner



Purpose:



Full control of the school management system.



The Owner has access to all V1 permissions.



isSystem:



true



\---



\## Administrator



Purpose:



Manage normal school administration and operations.



Access includes:



\- Users

\- Students

\- Parents

\- Teachers

\- Classes

\- Subjects

\- Academic sessions

\- Fees

\- Payments

\- Attendance

\- Exams

\- Results

\- Report cards

\- Reports

\- Communication

\- Audit viewing



\---



\## Teacher



Purpose:



Manage academic and classroom responsibilities.



Access includes:



\- View students

\- View parents

\- View teachers

\- View assigned classes

\- View assigned subjects

\- View academic information

\- Record attendance

\- Edit attendance

\- View assigned exams

\- Enter results

\- Edit results

\- View assigned reports

\- Communication where permitted



\---



\## Cashier



Purpose:



Manage school financial collection operations.



Access includes:



\- View fees

\- View assigned fee information

\- Record payments

\- View payment history

\- Create receipts

\- View receipts

\- View relevant financial reports



Cashier must not receive academic administration permissions by default.



\---



\## Student



Purpose:



Allow students to access their own school information.



Access is restricted to the authenticated student's own records.



Student access includes:



\- Own profile

\- Own class

\- Own subjects

\- Own attendance

\- Own fees

\- Own payments

\- Own results

\- Own report cards

\- Announcements



\---



\## Parent



Purpose:



Allow parents/guardians to access information belonging to their linked children.



Access is restricted to students linked to the authenticated parent.



Parent access includes:



\- Parent profile

\- Linked children

\- Children's classes

\- Children's subjects

\- Children's attendance

\- Children's fees

\- Children's payments

\- Children's results

\- Children's report cards

\- Announcements



\---



\## Staff



Purpose:



Provide limited operational access.



Staff access is permission-based and should only include the operations explicitly assigned to the role.



\---



\# 4. Permission Catalogue



\## User Management



\- users.view

\- users.create

\- users.edit

\- users.delete

\- users.approve

\- users.suspend

\- users.manage\_roles



\## School Setup



\- school.view

\- school.edit



\## Students



\- students.view

\- students.create

\- students.edit

\- students.delete

\- students.promote



\## Parents



\- parents.view

\- parents.create

\- parents.edit

\- parents.delete



\## Teachers and Staff



\- teachers.view

\- teachers.create

\- teachers.edit

\- teachers.delete



\## Classes



\- classes.view

\- classes.create

\- classes.edit

\- classes.delete

\- classes.assign\_students

\- classes.assign\_subjects



\## Subjects



\- subjects.view

\- subjects.create

\- subjects.edit

\- subjects.delete

\- subjects.assign\_teachers



\## Academic Sessions



\- academics.view

\- academics.create

\- academics.edit

\- academics.manage\_terms



\## Fees



\- fees.view

\- fees.create

\- fees.edit

\- fees.delete

\- fees.assign



\## Payments



\- payments.view

\- payments.create

\- payments.edit

\- payments.delete

\- payments.refund



\## Receipts



\- receipts.view

\- receipts.create



\## Attendance



\- attendance.view

\- attendance.record

\- attendance.edit



\## Examinations



\- exams.view

\- exams.create

\- exams.edit

\- exams.delete



\## Results



\- results.view

\- results.enter

\- results.edit

\- results.approve

\- results.publish



\## Report Cards



\- report\_cards.view

\- report\_cards.generate



\## Reports



\- reports.view

\- reports.generate



\## Communication



\- announcements.view

\- announcements.create

\- announcements.edit

\- announcements.delete

\- notifications.send



\## Audit



\- audit.view



\---



\# 5. Access Scope



Permissions alone do not determine the data a user can access.



The authorization system must also enforce scope.



\## Owner



Scope:



Entire school.



\## Administrator



Scope:



Entire school, according to assigned permissions.



\## Teacher



Scope:



Assigned classes, assigned subjects, and students connected to those assignments.



\## Cashier



Scope:



Financial records permitted by the assigned role.



\## Student



Scope:



Only the authenticated student's own records.



\## Parent



Scope:



Only students linked to the authenticated parent account.



\## Staff



Scope:



Only records required by assigned permissions.



\---



\# 6. Security Rules



1\. Every protected action must check authorization.

2\. Frontend visibility must never be treated as security.

3\. Backend/server-side authorization is mandatory.

4\. Users must not access another user's records by changing an ID in a URL.

5\. Students can only access their own records.

6\. Parents can only access their linked children's records.

7\. Teachers can only access records within their permitted assignments.

8\. Cashiers cannot automatically access academic administration.

9\. Permanent IDs must never be changed by role or User Type changes.

10\. Suspended or disabled accounts must not receive normal authenticated access.

11\. Role changes must be auditable.

12\. Permission changes must be auditable.

13\. Sensitive operations should generate audit records.

14\. System roles should be protected from accidental deletion.

15\. The Owner role represents full system access.



\---



\# 7. System Role Rules



System roles are created automatically when a new school installation is initialized.



System roles:



\- Owner

\- Administrator

\- Teacher

\- Cashier

\- Student

\- Parent

\- Staff



System roles have:



isSystem = true



System roles should not be deleted through the normal administration interface.



Their permissions may be controlled by the application design.



\---



\# 8. Custom Roles



The system must eventually support custom roles.



Example:



Academic Officer



Possible permissions:



\- students.view

\- students.edit

\- classes.view

\- subjects.view

\- academics.view

\- exams.view

\- results.view

\- results.enter

\- results.edit

\- report\_cards.view

\- report\_cards.generate



Custom roles:



\- have isSystem = false

\- can be created by authorized administrators

\- can be edited by authorized administrators

\- can be assigned to users

\- can be removed when no longer needed, subject to audit/history rules



\---



\# 9. Authorization Decision



For every protected action:



1\. Identify authenticated user.

2\. Confirm account status.

3\. Load assigned roles.

4\. Load permissions belonging to those roles.

5\. Check required permission.

6\. Check data scope.

7\. Allow or deny the action.

8\. Record an audit event where required.



Authorization result:



ALLOW



or



DENY



\---



\# 10. V1 Implementation Principle



RBAC must be configuration-driven.



Business modules should ask:



"Does this user have permission X?"



They should not hard-code:



"If user is ADMIN, allow."



This allows future schools to configure access without changing the core application.



\---



\# 11. Current Database Models



The current database already contains:



\- Role

\- Permission

\- UserRole

\- RolePermission



These models form the foundation of the V1 authorization system.



The current RBAC tables are empty and will be seeded after this specification is established.



\---



\# 12. Future Extensions



Possible future permission areas:



\- SMS

\- WhatsApp

\- Email

\- Online payments

\- Transport

\- Library

\- Hostel

\- Inventory

\- Payroll

\- Advanced reporting

\- Advanced analytics

\- Custom workflows



These should be added as modules rather than changing the core RBAC architecture.



\---



\# 13. Product Principle



The School Management System is a reusable product.



RBAC must therefore work for:



School A

School B

School C

...



using the same codebase while each school's installation maintains its own database and configuration.



Reusable does not mean multi-tenant.



Each deployed school instance has its own:



\- Database

\- School configuration

\- Users

\- Roles

\- Permissions

\- Academic records

\- Financial records

\- Audit history

