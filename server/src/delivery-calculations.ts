export interface DeliveryQuantities {
  acceptedQty: unknown;
  boRefusedQty: unknown;
}

export interface DeliveryAmountLine {
  acceptedQty: number;
  boRefusedQty: number;
  unitPrice: number;
}

function roundCurrency(amount: number): number {
  return Number(amount.toFixed(2));
}

export function validateDeliveryQuantities(
  productName: string,
  loadedQty: number,
  quantities: DeliveryQuantities,
): string | null {
  const values = [
    ['Accepted', quantities.acceptedQty],
    ['BO damaged', quantities.boRefusedQty],
  ] as const;

  for (const [label, value] of values) {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
      return `${productName}: ${label} quantity must be a whole number of units and cannot be negative.`;
    }
  }

  const acceptedQty = quantities.acceptedQty as number;
  const boRefusedQty = quantities.boRefusedQty as number;
  if (acceptedQty > loadedQty) {
    return `${productName}: accepted quantity ${acceptedQty} exceeds loaded quantity ${loadedQty}.`;
  }
  if (boRefusedQty > acceptedQty) {
    return `${productName}: BO damaged quantity ${boRefusedQty} cannot exceed accepted quantity ${acceptedQty}.`;
  }

  return null;
}

export function calculateDeliveryAmounts(
  lines: DeliveryAmountLine[],
  previousBalance: number,
  paymentMethod: string,
  amountCollected: number,
) {
  const productBillAmount = roundCurrency(lines.reduce(
    (sum, line) => sum + line.acceptedQty * line.unitPrice,
    0,
  ));
  const boDeductionAmount = roundCurrency(lines.reduce(
    (sum, line) => sum + line.boRefusedQty * line.unitPrice,
    0,
  ));
  const finalProductBill = Math.max(0, roundCurrency(productBillAmount - boDeductionAmount));
  const totalAmountDue = roundCurrency(finalProductBill + previousBalance);
  const clearedPaymentAmount = paymentMethod === 'Check' ? 0 : amountCollected;
  const balanceRemaining = Math.max(0, roundCurrency(totalAmountDue - clearedPaymentAmount));

  return {
    productBillAmount,
    boDeductionAmount,
    finalProductBill,
    previousBalance: roundCurrency(previousBalance),
    totalAmountDue,
    amountCollected: roundCurrency(amountCollected),
    clearedPaymentAmount: roundCurrency(clearedPaymentAmount),
    balanceRemaining,
    paymentStatus: balanceRemaining === 0 ? 'Paid' : clearedPaymentAmount > 0 ? 'Partial' : 'Unpaid',
  };
}
