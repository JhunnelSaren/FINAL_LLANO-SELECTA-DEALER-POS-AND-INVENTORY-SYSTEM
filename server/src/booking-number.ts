export function nextBookingNumber(year: number, existingNumbers: string[]): string {
  const prefix = `BK-${year}-`;
  const largestSequence = existingNumbers.reduce((largest, bookingNumber) => {
    if (!bookingNumber.startsWith(prefix)) return largest;
    const sequenceText = bookingNumber.slice(prefix.length);
    if (!/^\d+$/.test(sequenceText)) return largest;
    const sequence = Number(sequenceText);
    return Number.isSafeInteger(sequence) ? Math.max(largest, sequence) : largest;
  }, 0);

  return `${prefix}${String(largestSequence + 1).padStart(3, '0')}`;
}
