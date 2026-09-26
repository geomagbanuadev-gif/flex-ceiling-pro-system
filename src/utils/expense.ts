import { roundMoney, sumMoney } from "./finance";

export type ExpenseItemInput = {
  productCode: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount: number;
  vatRate: number;
  serialNumber: string;
};

export type CalculatedExpenseItem = ExpenseItemInput & {
  netAmount: number;
  vatAmount: number;
  totalAmount: number;
};

export function calculateExpenseItem(item: ExpenseItemInput): CalculatedExpenseItem {
  const gross = roundMoney(item.quantity * item.unitPrice);
  const netAmount = roundMoney(gross - item.discount);
  const vatAmount = roundMoney(netAmount * (item.vatRate / 100));

  return { ...item, netAmount, vatAmount, totalAmount: roundMoney(netAmount + vatAmount) };
}

export function calculateExpenseTotals(items: ExpenseItemInput[]) {
  const calculatedItems = items.map(calculateExpenseItem);
  const subtotal = sumMoney(calculatedItems.map((item) => item.netAmount));
  const vatAmount = sumMoney(calculatedItems.map((item) => item.vatAmount));

  return {
    items: calculatedItems,
    subtotal,
    vatAmount,
    grandTotal: roundMoney(subtotal + vatAmount),
  };
}

