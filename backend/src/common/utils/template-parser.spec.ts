import { describe, it, expect } from 'vitest';
import { interpolateTemplate, injectFooter } from './template-parser.util.js';
import { BrandingMode } from '@prisma/client';

describe('Template Parser & Dynamic Interpolation', () => {
  it('should interpolate single and nested dot-notation variables', () => {
    const template = 'Hello {{name}}, your balance is {{account.balance}} USD.';
    const params = {
      name: 'Alice',
      account: { balance: '42.50' },
    };

    const result = interpolateTemplate(template, params);
    expect(result).toBe('Hello Alice, your balance is 42.50 USD.');
  });

  it('should leave unmatched mustache tags intact', () => {
    const template = 'Welcome {{name}}! Your code is {{unknown.code}}.';
    const params = { name: 'Bob' };

    const result = interpolateTemplate(template, params);
    expect(result).toBe('Welcome Bob! Your code is {{unknown.code}}.');
  });

  it('should inject DispatchHub watermark footer for Co-Branded emails', () => {
    const html = '<html><body><p>Hello world</p></body></html>';
    const output = injectFooter(html, BrandingMode.CO_BRANDED);

    expect(output).toContain('Delivered via');
    expect(output).toContain('DispatchHub');
    expect(output).toContain('⚡');
  });

  it('should not inject platform watermark for White-Label emails', () => {
    const html = '<html><body><p>Hello world</p></body></html>';
    const output = injectFooter(html, BrandingMode.WHITE_LABEL);

    expect(output).not.toContain('Delivered via DispatchHub');
    expect(output).toBe(html);
  });
});
