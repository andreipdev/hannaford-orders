export interface GroceryData {
  item: string
  unitPrice: number  // Keep for compatibility
  priceRange: {
    min: number
    max: number
  }
  timesPurchased: number
  totalSpent: number
  spentPerMonth: number
  monthlyBreakdown: Record<string, number>
  monthlySpent: Record<string, number>
  includedItems: string[]
}
