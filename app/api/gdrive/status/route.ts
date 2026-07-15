export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isConnected } from "@/lib/gdrive";

export async function GET() {
  try {
    const connected = await isConnected();
    return NextResponse.json({ connected });
  } catch (e: any) {
    return NextResponse.json({ connected: false, error: e?.message }, { status: 500 });
  }
}
