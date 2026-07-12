export function addTenPercentMarkup(amount: number) {
  const numericAmount = Number(amount) || 0;
  return Number((numericAmount * 1.1).toFixed(2));
}
