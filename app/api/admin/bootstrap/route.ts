// ONE-TIME SETUP ENDPOINT.
// Creates (or promotes) the first admin account on a fresh deployment, since
// this environment's database isn't reachable from the assistant's sandbox to
// run a seed script directly. Protected by ADMIN_SETUP_SECRET so it can't be
// triggered by anyone who doesn't have that env var value.
//
// Usage: visit
//   https://<your-domain>/api/admin/bootstrap?secret=<ADMIN_SETUP_SECRET>
// once, then delete this route (or just leave ADMIN_SETUP_SECRET unset/rotated
// afterward — every call requires it to match).

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "ADMIN_SETUP_SECRET is not set on this deployment" }, { status: 500 });
  }
  if (!secret || secret !== process.env.ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    return NextResponse.json({ error: "ADMIN_EMAIL / ADMIN_PASSWORD are not set on this deployment" }, { status: 500 });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { password: hashed, role: "admin", name },
    create: { email, password: hashed, role: "admin", name },
  });

  return NextResponse.json({ ok: true, email: user.email, role: user.role });
}
