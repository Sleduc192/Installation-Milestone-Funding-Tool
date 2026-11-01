import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { HUB_TRUST_HEADER, readHubTrust } from "@/lib/hub-trust";

export interface WorkspaceUser {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string | null;
}

/**
 * Resolves the current user from the NextAuth session, or from a verified
 * Seamless Home Hub trust token. Hub visitors are created as installers the
 * first time they arrive; an existing account keeps its role.
 */
export async function getWorkspaceUser(): Promise<WorkspaceUser> {
  const session = await getServerSession(authOptions);
  const sessionEmail = session?.user?.email;

  if (sessionEmail) {
    const user = await prisma.user.findUnique({ where: { email: sessionEmail } });
    if (!user) throw new Error("User not found");
    return toWorkspaceUser(user);
  }

  const hubUser = await readHubTrust(headers().get(HUB_TRUST_HEADER));
  if (!hubUser) throw new Error("Not authenticated");

  const existing = await prisma.user.findUnique({ where: { email: hubUser.email } });
  if (existing) return toWorkspaceUser(existing);

  const password = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
  try {
    const created = await prisma.user.create({
      data: {
        email: hubUser.email,
        name: hubUser.name,
        password,
        role: "installer",
      },
    });
    return toWorkspaceUser(created);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.user.findUnique({ where: { email: hubUser.email } });
      if (raced) return toWorkspaceUser(raced);
    }
    throw error;
  }
}

function toWorkspaceUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  company: string | null;
}): WorkspaceUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    role: user.role,
    company: user.company,
  };
}
