import test from 'node:test';
import assert from 'node:assert/strict';
import { processOrderData, type PurchaseData } from '../src/services/orderData';
import { getDisplayMonth } from '../src/lib/months';

const purchase = (item: string, unitPrice: number, quantity: number, date: string): PurchaseData =>
  ({ item, unitPrice, quantity, date: new Date(date) });

test('combines category quantities, spend and distinct product names', () => {
  const [result] = processOrderData([
    purchase('Pasta penne', 2, 2, '2026-03-01'),
    purchase('Pasta spaghetti', 3, 1.5, '2026-03-20'),
    purchase('Pasta penne', 2.5, 1, '2026-04-01'),
  ]);
  assert.equal(result.category, 'Pasta');
  assert.equal(result.timesPurchased, 4.5);
  assert.equal(result.totalSpent, 11);
  assert.equal(result.spentPerMonth, 5.5);
  assert.deepEqual(result.priceRange, { min: 2, max: 3 });
  assert.deepEqual(result.monthlySpent, { 'March 2026': 8.5, 'April 2026': 2.5 });
  assert.deepEqual(result.includedItems, ['Pasta penne', 'Pasta spaghetti']);
  assert.deepEqual(result.includedItemsPerMonth['April 2026'], ['Pasta penne']);
});

test('keeps years separate and preserves first-of-month receipt dates across timezones', () => {
  const [result] = processOrderData([
    purchase('Unmapped test product', 2, 1, '2025-09-01'),
    purchase('Unmapped test product', 4, 1, '2026-09-01'),
  ]);
  assert.deepEqual(result.monthlySpent, { 'September 2025': 2, 'September 2026': 4 });
  assert.equal(result.spentPerMonth, 3);
});

test('applies configured estimates without mutating input, and retains unknown zero prices', () => {
  const records = [purchase('Asparagus', 0, 2, '2026-09-01'), purchase('Unmapped test product', 0, 1, '2026-09-01')];
  const before = structuredClone(records);
  const result = processOrderData(records);
  assert.equal(result[0].totalSpent, 7.98);
  assert.equal(result[1].totalSpent, 0);
  assert.deepEqual(records, before);
  assert.deepEqual(processOrderData([]), []);
});

test('selects previous calendar month at month-end and across new year', () => {
  assert.equal(getDisplayMonth(-1, new Date(2026, 2, 31)), 'February 2026');
  assert.equal(getDisplayMonth(-1, new Date(2026, 0, 31)), 'December 2025');
  assert.equal(getDisplayMonth(0, new Date(2026, 2, 31)), 'March 2026');
});
