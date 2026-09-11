# Marketing Demo Deployment

The marketing demo uses the **real School Management System application and real database contract**. It is not a mock UI or a second implementation.

## Environment boundary

Deploy the School Management System demo as a dedicated application/database pair. Do not point the demo at a production school's database.

Required demo environment variables:

```text
DATABASE_URL=<dedicated demo PostgreSQL database>
SESSION_SECRET=<unique random secret for the demo deployment>
DEMO_SEED=true
```

Run the seed once against the empty demo database:

```text
npm install
npm run demo:seed
```

The seed refuses to continue if `DEMO_SEED` is not exactly `true` or if the database already contains a school.

## Visitor experience

Green Basket's public platform links visitors to the dedicated demo deployment. The visitor does not need to create a Green Basket account first.

The demo deployment provides role-based demo accounts for the prepared school dataset. These accounts use the same authentication, permissions, portals, attendance, finance, exams/results and reporting code used by a real school deployment.

## Data safety

The demo database is disposable marketing data. Never place customer data in it. Never use a customer's `DATABASE_URL` for demo seeding.

The current demo seed creates a realistic school dataset from the live contract models, including students, parents, teachers, classes, subjects, attendance, fees, payments, allocations, exams, results, announcements, portal features and audit history.

## Future isolation enhancement

The current boundary is **deployment/database isolation**. If visitors are later allowed to mutate the demo extensively, add a disposable-session layer or periodic database reset before exposing write-heavy demo actions publicly. Do not weaken school authorization or production authentication to make the demo easier.
