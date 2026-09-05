import { db } from "../src/prisma/db";

const users = await db.orm.public.User.all();

console.log("USERS FOUND:", users.length);

for (const user of users) {
console.log({
id: user.id,
permanentId: user.permanentId,
name: user.name,
username: user.username,
email: user.email,
userType: user.userType,
status: user.status,
});
}
