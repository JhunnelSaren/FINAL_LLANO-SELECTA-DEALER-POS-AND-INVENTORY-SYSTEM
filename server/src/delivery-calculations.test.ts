import { describe, expect, it } from 'vitest';
import { calculateDeliveryAmounts, validateDeliveryQuantities } from './delivery-calculations.js';

describe('delivery quantity validation', () => {
  it('accepts 1000 accepted and no BO from a load of 1000', () => {
    expect(validateDeliveryQuantities('Cornetto', 1000, {
      acceptedQty: 1000,
      boRefusedQty: 0,
    })).toBeNull();
  });

  it('accepts BO damaged units as a subset of accepted units', () => {
    expect(validateDeliveryQuantities('Cornetto', 1000, {
      acceptedQty: 1000,
      boRefusedQty: 100,
    })).toBeNull();
  });

  it('rejects accepted units above the load', () => {
    expect(validateDeliveryQuantities('Cornetto', 1000, {
      acceptedQty: 1001,
      boRefusedQty: 0,
    })).toBe('Cornetto: accepted quantity 1001 exceeds loaded quantity 1000.');
  });

  it('rejects BO damaged units above accepted units', () => {
    expect(validateDeliveryQuantities('Cornetto', 1000, {
      acceptedQty: 900,
      boRefusedQty: 901,
    })).toBe('Cornetto: BO damaged quantity 901 cannot exceed accepted quantity 900.');
  });

  it.each([
    ['empty', ''],
    ['negative', -1],
    ['fractional', 1.5],
    ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
  ])('rejects %s unit quantities', (_label, acceptedQty) => {
    expect(validateDeliveryQuantities('Cornetto', 1000, {
      acceptedQty,
      boRefusedQty: 0,
    })).toContain('Accepted quantity must be a whole number');
  });
});

describe('delivery payment calculations', () => {
  const lines = [
    { acceptedQty: 1000, boRefusedQty: 100, unitPrice: 30 },
  ];

  it('deducts BO value once from the gross product bill and adds previous balance', () => {
    expect(calculateDeliveryAmounts(lines, 500, 'Cash', 1000)).toEqual({
      productBillAmount: 30000,
      boDeductionAmount: 3000,
      finalProductBill: 27000,
      previousBalance: 500,
      totalAmountDue: 27500,
      amountCollected: 1000,
      clearedPaymentAmount: 1000,
      balanceRemaining: 26500,
      paymentStatus: 'Partial',
    });
  });

  it('allows zero collection and leaves the full balance due', () => {
    const totals = calculateDeliveryAmounts(lines, 500, 'Cash', 0);
    expect(totals.amountCollected).toBe(0);
    expect(totals.balanceRemaining).toBe(27500);
    expect(totals.paymentStatus).toBe('Unpaid');
  });

  it('does not apply a pending bank check to the customer balance', () => {
    const totals = calculateDeliveryAmounts(lines, 500, 'Check', 1000);
    expect(totals.amountCollected).toBe(1000);
    expect(totals.clearedPaymentAmount).toBe(0);
    expect(totals.balanceRemaining).toBe(27500);
  });

  it('recalculates the final bill when BO is removed', () => {
    const totals = calculateDeliveryAmounts(
      [{ acceptedQty: 1000, boRefusedQty: 0, unitPrice: 30 }],
      500,
      'Cash',
      0,
    );
    expect(totals.finalProductBill).toBe(30000);
    expect(totals.totalAmountDue).toBe(30500);
  });
});
