# School Management System

A practical, configuration-driven school management system designed around the core workflows of private schools in Nigeria.

> **Portfolio context:** This repository is an important product-engineering predecessor and reference implementation for **SkulGo**, my current school-management product. It demonstrates the domain model, workflows, and engineering decisions behind the broader school platform.

## What it demonstrates

- School and organization setup
- Academic sessions, terms, classes, and subjects
- Student, parent, staff, and teacher management
- Attendance
- Exams, continuous assessment, results, grades, and positions
- Fees, billing, payments, allocations, balances, and receipts
- Parent/student/teacher portals
- School communication
- Reports and operational summaries
- School-scoped audit and administrative controls
- Configuration-driven behavior instead of unnecessary custom implementations

## Product principle

Build what schools actually need: **simple, transparent, connected, and trustworthy**.

The system targets the common operational core of private schools while using configuration for genuine differences. It deliberately avoids turning every possible school process into a separate feature.

## Engineering approach

The project follows:

**Audit → Real Gap → Smallest Useful Solution → Implement → Verify → Document → Move On**

The goal is not to make a checklist appear complete. A workflow is considered practically complete when a real school can use its important path safely and consistently.

## Current state

The repository contains a substantial school-management implementation and ongoing product-development history.

For the current product direction, see **[SkulGo](https://github.com/greenbasket-labs/skulgo)**.

## Relationship to SkulGo

SkulGo carries the current product direction forward with a connected-record model, school workspaces, role-based access, school isolation, offline-first workflows, and a clearer separation between a person's account and each school's records.

This repository remains useful as a product-engineering reference and development history.

## Technical direction

- Next.js
- TypeScript
- PostgreSQL
- Prisma
- SQLite / offline-first data flows
- Role-based access control
- Audit-oriented administrative workflows

## Development status

The core school workflow is substantially implemented. Remaining work is driven by end-to-end verification, production hardening, and concrete school needs rather than feature-count expansion.

## Security & data

Do not commit credentials, production secrets, or real student data. Use environment variables and appropriate test/demo data for development.

## Author

**Mohammed Musbahu Abdullahi** — software builder, smart contract developer, and security-focused researcher.
