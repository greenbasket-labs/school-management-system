import { hasPermission } from "../src/lib/permissions";

async function main() {
  console.log("USER 1 users.create:", await hasPermission(1, "users.create"));
  console.log("USER 1 users.edit:", await hasPermission(1, "users.edit"));

  console.log("USER 2 users.create:", await hasPermission(2, "users.create"));
  console.log("USER 2 users.edit:", await hasPermission(2, "users.edit"));

  console.log("USER 2 attendance.mark:", await hasPermission(2, "attendance.mark"));
  console.log("USER 2 results.enter:", await hasPermission(2, "results.enter"));

  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
