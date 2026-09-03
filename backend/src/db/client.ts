import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!, {
  prepare: false,
  ssl: process.env.DATABASE_CA_CERT ? { ca: process.env.DATABASE_CA_CERT } : undefined,
});

export const db = drizzle(client, { schema });
