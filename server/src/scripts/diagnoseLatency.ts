/**
 * Where does page-load time go? Run ON THE PRODUCTION SERVER:
 *
 *   cd /var/www/tourbnt/server && npm run diagnose:latency
 *
 * Prints the database region (read from DATABASE_URL), the network cost of reaching it,
 * the cost of one query on an open connection, Redis latency, and the API's own response
 * times for a few public endpoints. Read-only: it only runs `select 1` and GETs.
 */
import 'dotenv/config';
import dns from 'node:dns/promises';
import net from 'node:net';
import postgres from 'postgres';
import Redis from 'ioredis';

const ms = (start: bigint) => Number(process.hrtime.bigint() - start) / 1e6;
const fmt = (n: number) => `${n.toFixed(1)} ms`;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

function verdict(label: string, value: number, good: number, bad: number) {
    const tag = value <= good ? 'OK  ' : value >= bad ? 'SLOW' : 'MEH ';
    console.log(`  [${tag}] ${label}: ${fmt(value)}`);
}

async function checkDatabase() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.log('DATABASE_URL is not set — run this from the server/ directory that has .env');
        return;
    }
    const { hostname, port } = new URL(url);
    // Neon hostnames carry the region: ep-xxx[-pooler].<region>.aws.neon.tech
    const region = hostname.match(/\.([a-z]{2}-[a-z]+-\d)\.aws\.neon\.tech$/)?.[1] ?? 'unknown (not a Neon AWS hostname)';
    console.log('\nDatabase');
    console.log(`  host:   ${hostname}`);
    console.log(`  region: ${region}${region === 'ap-southeast-1' ? '  (Singapore)' : region.startsWith('us-') ? '  (USA — ~200 ms+ from a Singapore server!)' : ''}`);
    console.log(`  pooled: ${hostname.includes('-pooler') ? 'yes (-pooler endpoint)' : 'no (direct endpoint)'}`);

    let t = process.hrtime.bigint();
    const addrs = await dns.lookup(hostname, { all: true });
    verdict('DNS lookup', ms(t), 20, 200);
    console.log(`  resolved: ${addrs.map((a) => a.address).join(', ')}`);

    const tcp: number[] = [];
    for (let i = 0; i < 5; i++) {
        t = process.hrtime.bigint();
        await new Promise<void>((resolve, reject) => {
            const s = net.connect({ host: hostname, port: Number(port || 5432), family: 4 }, () => { s.end(); resolve(); });
            s.setTimeout(5000, () => { s.destroy(); reject(new Error('TCP connect timeout')); });
            s.on('error', reject);
        });
        tcp.push(ms(t));
    }
    verdict('Network round trip to DB (TCP connect, median of 5)', median(tcp), 10, 80);

    const sql = postgres(url, { max: 1, connect_timeout: 10 });
    try {
        t = process.hrtime.bigint();
        await sql`select 1`;
        verdict('New DB connection + first query (TLS + auth)', ms(t), 100, 800);
        const q: number[] = [];
        for (let i = 0; i < 10; i++) {
            t = process.hrtime.bigint();
            await sql`select 1`;
            q.push(ms(t));
        }
        verdict('Query on an open connection (median of 10)', median(q), 10, 80);
        console.log('  -> A page that runs 10 queries one after another costs ~10x this number.');
    } finally {
        await sql.end({ timeout: 2 });
    }
}

async function checkRedis() {
    const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    console.log('\nRedis');
    const redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 1, retryStrategy: () => null, connectTimeout: 2000 });
    redis.on('error', () => undefined);
    try {
        await redis.connect();
        const p: number[] = [];
        for (let i = 0; i < 10; i++) {
            const t = process.hrtime.bigint();
            await redis.ping();
            p.push(ms(t));
        }
        verdict('PING (median of 10)', median(p), 2, 20);
        const keys = await redis.dbsize();
        let routeKeys = 0;
        let cursor = '0';
        do {
            const [next, found] = await redis.scan(cursor, 'MATCH', 'route:*', 'COUNT', 1000);
            cursor = next;
            routeKeys += found.length;
        } while (cursor !== '0');
        console.log(`  keys: ${keys} total, ${routeKeys} cached API responses (route:*)`);
        if (routeKeys === 0) console.log('  !! No cached responses — the API response cache is not being used.');
        const mem = (await redis.info('memory')).match(/used_memory_human:(\S+)/)?.[1];
        const maxmem = (await redis.info('memory')).match(/maxmemory_human:(\S+)/)?.[1];
        console.log(`  memory: ${mem} used, maxmemory ${maxmem}`);
    } catch (err) {
        console.log(`  [FAIL] Redis unreachable at ${url}: ${(err as Error).message}`);
        console.log('  -> Every cached endpoint is hitting the database.');
    } finally {
        redis.disconnect();
    }
}

async function checkApi() {
    const base = process.env.DIAGNOSE_API_URL || `http://127.0.0.1:${process.env.PORT || 8000}`;
    const paths = ['/api/v1/home', '/api/v1/tours?limit=12', '/api/v1/global/categories/approved', '/api/v1/agencies'];
    console.log(`\nAPI (${base}) — each endpoint twice: 1st may miss the cache, 2nd should hit it`);
    for (const path of paths) {
        const times: string[] = [];
        let status = 0;
        for (let i = 0; i < 2; i++) {
            const t = process.hrtime.bigint();
            try {
                const res = await fetch(base + path);
                await res.arrayBuffer();
                status = res.status;
                times.push(fmt(ms(t)));
            } catch (err) {
                times.push(`error: ${(err as Error).message}`);
            }
        }
        console.log(`  ${status} ${path}: ${times.join('  then  ')}`);
    }
    console.log('  -> A cache hit should be a few ms. If the 2nd call is as slow as the 1st, caching is off.');
}

async function main() {
    console.log('TourBNT latency diagnosis');
    await checkDatabase().catch((err) => console.log(`  [FAIL] ${(err as Error).message}`));
    // API first: cached responses only live 60-120s, so Redis must be inspected right after they are written.
    await checkApi();
    await checkRedis();
    console.log('\nRule of thumb: same-region DB round trip should be < 5 ms. If it is 150+ ms, the');
    console.log('database is not in the same region as this server, and that alone explains slow pages.');
}

void main();
