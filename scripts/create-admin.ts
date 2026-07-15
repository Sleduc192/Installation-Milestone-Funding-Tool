// One-off script to create (or promote) the first admin user.
// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... ADMIN_NAME="Your Name" \
//        npx tsx --require dotenv/config scripts/create-admin.ts

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars before running this script.");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: { password: hashed, role: "admin", name },
    });
    console.log(`Updated existing user ${email} -> role=admin, password reset.`);
  } else {
    await prisma.user.create({
      data: { email, password: hashed, name, role: "admin", company: "" },
    });
    console.log(`Created admin user ${email}.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
