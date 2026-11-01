import { test, describe } from 'node:test';
import assert from 'node:assert';
import { normalizeError } from '../error-handler';
import { AppError } from '../error.types';
import { redactSensitiveData } from '../error-logger';

describe('DispatchHub Error Normalizer', () => {
  test('normalizes network errors correctly', () => {
    const err = new TypeError('Failed to fetch');
    const normalized = normalizeError(err);
    assert.strictEqual(normalized instanceof AppError, true);
    assert.strictEqual(normalized.code, 'NETWORK_ERROR');
    assert.strictEqual(normalized.retryable, true);
  });

  test('normalizes timeout/abort errors correctly', () => {
    const err = new Error('The operation was aborted');
    err.name = 'AbortError';
    const normalized = normalizeError(err);
    assert.strictEqual(normalized.code, 'TIMEOUT_ERROR');
    assert.strictEqual(normalized.retryable, true);
  });

  test('normalizes HTTP 401 Unauthorized', () => {
    const err = { statusCode: 401, message: 'Invalid JWT signature' };
    const normalized = normalizeError(err);
    assert.strictEqual(normalized.code, 'UNAUTHORIZED');
    assert.strictEqual(normalized.retryable, false);
  });

  test('normalizes HTTP 400 Bad Request with field errors', () => {
    const err = {
      statusCode: 400,
      data: {
        message: ['email must be an email', 'name should not be empty'],
      },
    };
    const normalized = normalizeError(err);
    assert.strictEqual(normalized.code, 'BAD_REQUEST');
    assert.strictEqual(normalized.retryable, false);
    assert.ok(normalized.fieldErrors);
    assert.ok(normalized.fieldErrors['email']);
  });

  test('normalizes HTTP 502/503/504 as retryable server errors', () => {
    const err502 = { statusCode: 502, message: 'Bad Gateway' };
    const normalized = normalizeError(err502);
    assert.strictEqual(normalized.code, 'BAD_GATEWAY');
    assert.strictEqual(normalized.retryable, true);
  });
});

describe('DispatchHub Sensitive Data Redactor', () => {
  test('redacts bearer tokens, API keys, and passwords', () => {
    const sensitive = {
      password: 'superSecretPassword123!',
      apiKey: 'dh_live_abc123456789012345678901234567890',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy',
      safeField: 'Regular public message',
    };

    const redacted = redactSensitiveData(sensitive);
    assert.strictEqual(redacted.password, '[REDACTED]');
    assert.strictEqual(redacted.apiKey, '[REDACTED]');
    assert.strictEqual(redacted.token, '[REDACTED]');
    assert.strictEqual(redacted.safeField, 'Regular public message');
  });

  test('redacts raw string bearer tokens', () => {
    const raw = 'Authorization: Bearer mySecretToken123xyz';
    const redacted = redactSensitiveData(raw);
    assert.strictEqual(redacted.includes('mySecretToken123xyz'), false);
    assert.strictEqual(redacted.includes('[REDACTED]'), true);
  });
});
