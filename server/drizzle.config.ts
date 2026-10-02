import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// DATABASE_URL is provided later (see .env.example at the repo root and in /server).
// drizzle-kit only needs it to generate/run migrations, not to load this file.
export default defineConfig({
  out: './drizzle',
  schema: './src/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
});
