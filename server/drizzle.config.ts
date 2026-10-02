import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

// DATABASE_URL is provided later (see server/.env.example).
// drizzle-kit only needs it to generate/run migrations, not to load this file.
export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost:5432/placeholder',
  },
  verbose: true,
  strict: true,
});
