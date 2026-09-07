import "dotenv/config";
import { authenticateUser } from "../src/lib/login";

async function main() {
  const result = await authenticateUser(
    "admin",
    "Admin@12345",
  );

  if (!result.success) {
    console.log("LOGIN FAILED");
    console.log("REASON:", result.reason);
    return;
  }

  const user = result.user;

  console.log("LOGIN SUCCESS");
  console.log("USER ID:", user.id);
  console.log("NAME:", user.name);
  console.log("USERNAME:", user.username);
  console.log("USER TYPE:", user.userType);
  console.log("STATUS:", user.status);
}

main().catch((error) => {
  console.error("TEST FAILED");
  console.error(error);
  process.exit(1);
});