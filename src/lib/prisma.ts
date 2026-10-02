import {
  PrismaClient,
} from "@prisma/client";

import {
  PrismaPg,
} from "@prisma/adapter-pg";


const globalForPrisma =
  globalThis as unknown as {
    prisma?:
      PrismaClient;
  };


function requireDatabaseUrl():
string {
  const value =
    process.env
      .DATABASE_URL
      ?.trim();


  if (!value) {
    throw new Error(
      [
        "DATABASE_URL_MISSING",
        "Growth OS runtime cannot start Prisma without DATABASE_URL.",
        "Expected PostgreSQL database: signal_db.",
        "Do not allow pg to fall back to the operating-system username database.",
      ].join(
        " "
      )
    );
  }


  let parsed:
    URL;


  try {
    parsed =
      new URL(
        value
      );
  } catch {
    throw new Error(
      "DATABASE_URL_INVALID: DATABASE_URL is not a valid PostgreSQL URL"
    );
  }


  if (
    parsed.protocol !==
      "postgresql:" &&
    parsed.protocol !==
      "postgres:"
  ) {
    throw new Error(
      `DATABASE_URL_INVALID_PROTOCOL:${parsed.protocol}`
    );
  }


  const databaseName =
    parsed.pathname
      .replace(
        /^\/+/,
        ""
      )
      .split(
        "?"
      )[0]
      ?.trim();


  if (!databaseName) {
    throw new Error(
      "DATABASE_URL_DATABASE_NAME_REQUIRED"
    );
  }


  return value;
}


const databaseUrl =
  requireDatabaseUrl();


const adapter =
  new PrismaPg({
    connectionString:
      databaseUrl,
  });


export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });


if (
  process.env
    .NODE_ENV !==
  "production"
) {
  globalForPrisma.prisma =
    prisma;
}
