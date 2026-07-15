export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export async function GET() {
  try {
    const user = await getWorkspaceUser();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const patterns = await prisma.rejectionPattern.findMany({
      orderBy: { id: "asc" },
    });

    return NextResponse.json(patterns);
  } catch (error: any) {
    console.error("Rejection patterns error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
