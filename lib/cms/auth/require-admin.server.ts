import "server-only";

import { auth } from "@/auth";

export class AdminAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireAdminSession() {
  const session = await auth();
  const allowedGithubId = process.env.GITHUB_ALLOWED_USER_ID;

  if (!session?.user?.id) {
    throw new AdminAuthError(401, "Unauthorized");
  }

  if (!allowedGithubId || session.user.id !== allowedGithubId) {
    throw new AdminAuthError(403, "Forbidden");
  }

  return session;
}
