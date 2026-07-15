import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export interface WorkspaceUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

/**
 * Resolves the current signed-in user from the NextAuth session.
 * Replaces the old Abacus-workspace-proxy header lookup (X-Abacus-*) — this
 * standalone deployment has a real login, so every request that reaches here
 * is expected to already be authenticated (middleware.ts enforces that).
 */
export async function getWorkspaceUser(): Promise<WorkspaceUser> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;

  if (!email) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    role: user.role,
    company: user.company,
  };
}
