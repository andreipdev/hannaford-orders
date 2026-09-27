import { categoryMappings } from '../config/categories';
import { findDefaultPrice } from '../config/defaultPrices';
import { getMonthKey } from '../lib/months';
import type { GroceryData } from '../types/groceryTypes';

export interface PurchaseData {
  item: string;
  unitPrice: number;
  quantity: number;
  date: Date;
}

/** Summarize cached receipt lines without changing the source records. */
export function processOrderData(purchases: PurchaseData[]): GroceryData[] {
  const normalized = purchases.map(purchase => ({
    ...purchase,
    unitPrice: purchase.unitPrice === 0
      ? (findDefaultPrice(purchase.item) ?? 0)
      : purchase.unitPrice,
  }));
    const getCategoryName = (itemName: string): string => {
      for (const [category, pattern] of Object.entries(categoryMappings)) {
        if (pattern.test(itemName)) return category;
      }
      return itemName;
    };

    const priceRanges = new Map<string, { min: number; max: number }>();

    normalized.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);

      if (purchase.unitPrice > 0) {
        const current = priceRanges.get(categoryName) ?? { min: Infinity, max: -Infinity };
        priceRanges.set(categoryName, {
          min: Math.min(current.min, purchase.unitPrice),
          max: Math.max(current.max, purchase.unitPrice),
        });
      }
    });

    const itemMap = new Map();
    normalized.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);
      const month = getMonthKey(purchase.date);
      const key = categoryName;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: categoryName,
          category: categoryName,
          unitPrice: purchase.unitPrice || (priceRanges.get(categoryName)?.min || 0),
          priceRange: priceRanges.get(categoryName) || { min: 0, max: 0 },
          timesPurchased: 0,
          monthlyBreakdown: {},
          monthlySpent: {},
          totalSpent: 0,
          includedItems: new Set<string>(),
          includedItemsPerMonth: {},
        });
      }

      const itemData = itemMap.get(key);
      itemData.timesPurchased += purchase.quantity;
      if (!itemData.monthlyBreakdown[month]) {
        itemData.monthlyBreakdown[month] = 0;
        itemData.monthlySpent[month] = 0;
        itemData.includedItemsPerMonth[month] = new Set<string>();
      }
      itemData.monthlyBreakdown[month] += purchase.quantity;
      itemData.monthlySpent[month] += purchase.unitPrice * purchase.quantity;
      itemData.totalSpent += purchase.unitPrice * purchase.quantity;
      itemData.includedItems.add(purchase.item);
      itemData.includedItemsPerMonth[month].add(purchase.item);
    });

    for (const itemData of Array.from(itemMap.values())) {
      const totalMonthlySpent = (Object.values(itemData.monthlySpent) as number[]).reduce((sum, s) => sum + s, 0);
      const numberOfMonths = Object.keys(itemData.monthlySpent).length;
      itemData.spentPerMonth = numberOfMonths > 0 ? totalMonthlySpent / numberOfMonths : 0;
    }

    return Array.from(itemMap.values())
      .map(item => ({
        ...item,
        includedItems: Array.from(item.includedItems).sort(),
        includedItemsPerMonth: Object.fromEntries(
          Object.entries(item.includedItemsPerMonth).map(
            ([month, items]) => [month, Array.from(items as Set<string>).sort()]
          )
        ),
      }))
      .sort((a, b) => b.spentPerMonth - a.spentPerMonth);
}
