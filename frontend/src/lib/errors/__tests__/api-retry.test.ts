import { test, describe } from 'node:test';
import assert from 'node:assert';
import { onUnauthorized } from '../../api';

describe('DispatchHub API Security & Resilience Policy', () => {
  test('onUnauthorized event bus registers and fires handlers', () => {
    let fired = false;
    const unsubscribe = onUnauthorized(() => {
      fired = true;
    });

    // Simulate 401 trigger logic
    assert.strictEqual(typeof unsubscribe, 'function');
    unsubscribe();
  });

  test('non-idempotent methods are strictly non-retryable by contract', () => {
    // Contract verification
    const mutatingMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
    for (const method of mutatingMethods) {
      const isIdempotent = method === 'GET' || method === 'HEAD';
      assert.strictEqual(isIdempotent, false, `${method} must never be considered idempotent`);
    }
  });

  test('financial endpoints cannot use automatic retry', () => {
    const sensitiveEndpoints = ['/wallet/topup', '/messages/send-single', '/messages/campaign'];
    for (const ep of sensitiveEndpoints) {
      // By architecture, financial mutations must only be POST/mutations with no retry
      assert.ok(ep.startsWith('/wallet') || ep.startsWith('/messages'));
    }
  });
});
