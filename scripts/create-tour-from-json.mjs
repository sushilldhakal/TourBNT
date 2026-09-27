#!/usr/bin/env node
/**
 * Create a tour by POSTing a JSON payload to the API (no web UI).
 *
 * Prerequisites:
 * - Server running (e.g. npm run dev in server/)
 * - Valid auth token for a user with admin or seller role
 *
 * Usage:
 *   node scripts/create-tour-from-json.mjs [path-to-payload.json]
 *   AUTH_TOKEN=your_jwt node scripts/create-tour-from-json.mjs
 *
 * Default payload: scripts/tour-payload.example.json
 * API URL: NEXT_PUBLIC_BACKEND_URL or http://localhost:8000
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:8000';
const API_URL = `${BASE_URL.replace(/\/$/, '')}/api/v1`;
const defaultPayload = path.join(__dirname, 'tour-payload.example.json');
const payloadPath = process.argv[2] || defaultPayload;

async function main() {
  const token = process.env.AUTH_TOKEN;
  if (!token) {
    console.error('Missing AUTH_TOKEN. Set it with:');
    console.error('  AUTH_TOKEN=your_jwt node scripts/create-tour-from-json.mjs [payload.json]');
    console.error('Get a token by logging in via the web UI or /api/v1/users/login');
    process.exit(1);
  }

  let payload;
  try {
    const fs = await import('fs');
    const raw = fs.readFileSync(payloadPath, 'utf8');
    payload = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to read or parse payload file:', payloadPath, e.message);
    process.exit(1);
  }

  if (!payload.title || payload.title.length < 2) {
    console.error('Payload must include "title" (min 2 characters)');
    process.exit(1);
  }
  if (!payload.code || payload.code.length < 6) {
    console.error('Payload must include "code" (min 6 characters)');
    process.exit(1);
  }
  if (!payload.excerpt || payload.excerpt.length < 1) {
    console.error('Payload must include "excerpt"');
    process.exit(1);
  }

  const url = `${API_URL}/tours`;
  console.log('POST', url);
  console.log('Payload keys:', Object.keys(payload).join(', '));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('Request failed:', res.status, res.statusText);
    console.error('Response:', JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log('Tour created successfully.');
  const tour = data.data || data.tour || data;
  if (tour._id) console.log('Tour ID:', tour._id);
  if (tour.code) console.log('Code:', tour.code);
  console.log(JSON.stringify(data, null, 2));
}

main();
