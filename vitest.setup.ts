// Global setup for vitest - runs before any tests
import 'dotenv/config';

export default async function setup() {
  // Override with test database
  process.env.DATABASE_URL = 'file:./test.db';
}

