import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

// Load environment variables from .env so Prisma CLI has access to DATABASE_URL
dotenv.config({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env and configure DATABASE_URL.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: databaseUrl,
  },
});
