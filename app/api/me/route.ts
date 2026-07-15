export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export async function GET() {
  try {
    const user = await getWorkspaceUser();
    return NextResponse.json(user);
  } catch (error: any) {
    console.error("Me endpoint error:", error);
    return NextResponse.json(
      { id: "unknown", email: "user@workspace", name: "User", role: "installer", company: null },
      { status: 200 }
    );
  }
}
