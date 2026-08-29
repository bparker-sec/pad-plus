import { describe, it, expect } from 'vitest';
import { redact } from './logbuffer';

describe('redact', () => {
  it('redacts Bearer tokens', () => {
    const out = redact('Authorization: Bearer abcDEF123456ghijkl.mnop-qrst');
    expect(out).toBe('Authorization: Bearer [redacted]');
  });

  it('redacts JWT-shaped strings', () => {
    const out = redact('token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig');
    expect(out).toContain('[redacted-jwt]');
    expect(out).not.toContain('eyJhbGci');
  });

  it('redacts access_token / refresh_token assignments', () => {
    expect(redact('access_token=abcDEF1234567890xyz')).toBe(
      'access_token=[redacted]',
    );
    expect(redact('"refresh_token": "abcDEF1234567890xyz"')).toContain(
      '[redacted]',
    );
  });

  it('leaves ordinary text untouched', () => {
    const msg = 'OneDrive sign-in failed: timeout after 4000ms';
    expect(redact(msg)).toBe(msg);
  });
});
