import { describe, expect, it } from 'vitest';
import { nextBookingNumber } from './booking-number.js';

describe('nextBookingNumber', () => {
  it('continues the existing year sequence using the established format', () => {
    expect(nextBookingNumber(2026, ['BK-2026-001', 'BK-2026-002', 'BK-2026-003'])).toBe('BK-2026-004');
  });

  it('does not reuse a sequence when existing numbers exceed three digits', () => {
    expect(nextBookingNumber(2026, ['BK-2026-1001', 'BK-2026-999'])).toBe('BK-2026-1002');
  });

  it('ignores malformed and other-year booking numbers', () => {
    expect(nextBookingNumber(2026, ['BK-2025-099', 'BK-2026-ABC', 'BK-2026-004'])).toBe('BK-2026-005');
  });

  it('starts at one when the year has no bookings', () => {
    expect(nextBookingNumber(2027, [])).toBe('BK-2027-001');
  });
});
