import fs from 'node:fs';
import path from 'node:path';

import dotenv from 'dotenv';

const repoRoot = path.resolve(__dirname, '../..');
const envTestPath = path.join(repoRoot, '.env.test');
const envPath = path.join(repoRoot, '.env');

if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
} else if (!process.env.DATABASE_URL && fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    url.pathname = '/hackathon_test';
    process.env.DATABASE_URL = url.toString();
  }
}
