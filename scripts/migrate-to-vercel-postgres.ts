/**
 * Copy the existing Postgres database into a new Vercel Marketplace Neon
 * database. The source (DATABASE_URL) is only read. Nothing is deleted there.
 *
 * Blob is the wrong store for this data: users, submissions, and photos are a
 * relational graph, photo analysis updates individual rows while the parent
 * submission is also written, and the tables hold password hashes plus the
 * Google Drive refresh token. The existing Blob store is public and already
 * holds image files. Neon Postgres on the Subcontractorhub team is the
 * Vercel-native fit, and this app keeps using Prisma.
 *
 * Owner steps (no secrets in git):
 *   1. Vercel dashboard → team Subcontractorhub → Marketplace → Neon.
 *      Add a database to project installation-milestone-funding-tool.
 *      Do not remove or overwrite the current DATABASE_URL database.
 *   2. Export the new connection string as TARGET_DATABASE_URL in the shell
 *      only. Keep DATABASE_URL pointed at the current database.
 *   3. From the repo root:
 *        npx tsx scripts/migrate-to-vercel-postgres.ts
 *      Add --dry-run to print row counts and write nothing.
 *   4. Compare the printed counts. Then set the project's DATABASE_URL
 *      (Production and Preview) to the new Neon URL and redeploy.
 *      Leave the old database running.
 */

import { spawnSync } from "node:child_process";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.local" });
dotenv.config();

const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.env.TARGET_DATABASE_URL;
const dryRun = process.argv.includes("--dry-run");

function identity(url: string): string {
  const parsed = new URL(url);
  const db = parsed.pathname.replace(/\/$/, "");
  return `${parsed.hostname}${db}`;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!sourceUrl) fail("DATABASE_URL is required and is the existing source database.");
if (!targetUrl) {
  fail("TARGET_DATABASE_URL is required. It must be the new Vercel Marketplace Neon URL, not the current DATABASE_URL.");
}
if (identity(sourceUrl) === identity(targetUrl)) {
  fail("Refusing to run: DATABASE_URL and TARGET_DATABASE_URL point at the same database.");
}

function clientFor(url: string): PrismaClient {
  return new PrismaClient({ datasources: { db: { url } } });
}

function asInputJson(value: Prisma.JsonValue): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

function pushTargetSchema(): void {
  const result = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], {
    env: { ...process.env, DATABASE_URL: targetUrl },
    stdio: "inherit",
  });
  if (result.status !== 0) fail("prisma db push against TARGET_DATABASE_URL failed. The source database was not modified.");
}

async function copyModel<T extends { id?: string | number; key?: string }>(
  label: string,
  read: () => Promise<T[]>,
  write: (row: T) => Promise<void>
): Promise<number> {
  const rows = await read();
  console.log(`${label}: ${rows.length}`);
  if (dryRun) return rows.length;
  for (const row of rows) await write(row);
  return rows.length;
}

async function main() {
  if (!dryRun) pushTargetSchema();

  const source = clientFor(sourceUrl!);
  const target = dryRun ? null : clientFor(targetUrl!);

  try {
    await copyModel(
      "users",
      () => source.user.findMany(),
      async (row) => {
        const { id, ...data } = row;
        await target!.user.upsert({ where: { id }, create: row, update: data });
      }
    );

    await copyModel(
      "photo_categories",
      () => source.photoCategory.findMany(),
      async (row) => {
        const { id, ...data } = row;
        await target!.photoCategory.upsert({ where: { id }, create: row, update: data });
      }
    );

    await copyModel(
      "approved_photos",
      () => source.approvedPhoto.findMany(),
      async (row) => {
        const { id, ...data } = row;
        await target!.approvedPhoto.upsert({ where: { id }, create: row, update: data });
      }
    );

    await copyModel(
      "rejection_patterns",
      () => source.rejectionPattern.findMany(),
      async (row) => {
        const { id, ...data } = row;
        await target!.rejectionPattern.upsert({ where: { id }, create: row, update: data });
      }
    );

    await copyModel(
      "system_settings",
      () => source.systemSetting.findMany(),
      async (row) => {
        const { key, ...data } = row;
        await target!.systemSetting.upsert({ where: { key }, create: row, update: data });
      }
    );

    await copyModel(
      "audit_log",
      () => source.auditLog.findMany(),
      async (row) => {
        const { id, ...rest } = row;
        const data = { ...rest, details: asInputJson(row.details) };
        await target!.auditLog.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
    );

    await copyModel(
      "photopack_submissions",
      () => source.photopackSubmission.findMany(),
      async (row) => {
        const { id, ...rest } = row;
        const data = {
          ...rest,
          expectedCategories: asInputJson(row.expectedCategories),
          soldEquipment: asInputJson(row.soldEquipment),
          designCadFiles: asInputJson(row.designCadFiles),
        };
        await target!.photopackSubmission.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
    );

    await copyModel(
      "submission_photos",
      () => source.submissionPhoto.findMany(),
      async (row) => {
        const { id, ...rest } = row;
        const data = { ...rest, analysisResult: asInputJson(row.analysisResult) };
        await target!.submissionPhoto.upsert({ where: { id }, create: { id, ...data }, update: data });
      }
    );

    if (!dryRun && target) {
      await target.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('photo_categories', 'id'), COALESCE((SELECT MAX(id) FROM photo_categories), 1), true)`
      );
      await target.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('rejection_patterns', 'id'), COALESCE((SELECT MAX(id) FROM rejection_patterns), 1), true)`
      );
      await target.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('audit_log', 'id'), COALESCE((SELECT MAX(id) FROM audit_log), 1), true)`
      );
    }

    console.log(dryRun ? "Dry run finished. No data was written." : "Copy finished. The source database was not modified.");
  } finally {
    await source.$disconnect();
    if (target) await target.$disconnect();
  }
}

main().catch((error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Database error ${error.code}`);
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Migration failed");
  }
  process.exit(1);
});
