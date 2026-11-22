import "dotenv/config";
import path from "node:path";
import {
  defineConfig,
  env,
} from "prisma/config";

export default defineConfig({
  schema: path.join(
    "prisma",
    "schema.prisma"
  ),
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://build:build@localhost:5432/build",
  },
});
