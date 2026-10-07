import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { routeCompletion, resetProviderCooldowns } from './aiRouter';
import { AIProvider, AIProviderError } from './providers';

const msgs = [{ role: 'user' as const, content: 'hi' }];
const ok = (name: string): AIProvider => ({ name, isConfigured: () => true, complete: async () => ({ text: `from ${name}`, model: 'm' }) });
const failing = (name: string, err: Error, calls: { n: number } = { n: 0 }): AIProvider => ({
    name, isConfigured: () => true, complete: async () => { calls.n++; throw err; },
});

beforeEach(() => resetProviderCooldowns());

test('uses the first provider when it works', async () => {
    const r = await routeCompletion(msgs, [ok('a'), ok('b')]);
    assert.ok(r.ok && r.provider === 'a');
});

test('falls back on rate limit, quota and generic errors', async () => {
    const r = await routeCompletion(msgs, [
        failing('a', new AIProviderError('rate_limit', 'x', 429)),
        failing('b', new AIProviderError('quota', 'x')),
        failing('c', new Error('boom')),
        ok('d'),
    ]);
    assert.ok(r.ok && r.provider === 'd');
    assert.deepEqual(r.attempts.map((a) => a.outcome), ['rate_limit', 'quota', 'unavailable', 'success']);
});

test('returns ok:false when every provider fails, and never throws', async () => {
    const r = await routeCompletion(msgs, [failing('a', new Error('x')), failing('b', new AIProviderError('rate_limit', 'x'))]);
    assert.equal(r.ok, false);
    assert.equal(r.attempts.length, 2);
});

test('returns ok:false with no providers configured', async () => {
    assert.equal((await routeCompletion(msgs, [])).ok, false);
});

test('a rate-limited provider is skipped while on cooldown', async () => {
    const calls = { n: 0 };
    const a = failing('a', new AIProviderError('rate_limit', 'x', 429), calls);
    await routeCompletion(msgs, [a, ok('b')]);
    const r = await routeCompletion(msgs, [a, ok('b')]);
    assert.equal(calls.n, 1);
    assert.ok(r.ok && r.provider === 'b');
    assert.equal(r.attempts[0].outcome, 'skipped_cooldown');
});
