import { redirect } from "next/navigation";
import {
  getCurrentUser,
  isCurrentSessionLocked,
} from "./current-user";
import { hasPermission } from "./permissions";

export async function requireAuth() {
  const locked = await isCurrentSessionLocked();

  if (locked) {
    redirect("/unlock");
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requirePermission(
  permissionCode: string,
) {
  const user = await requireAuth();

  const allowed = await hasPermission(
    user.id,
    permissionCode,
  );

  if (!allowed) {
    throw new Error(
      `Permission denied: ${permissionCode}`,
    );
  }

  return user;
}