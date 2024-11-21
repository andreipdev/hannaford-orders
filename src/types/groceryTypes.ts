export interface GroceryData {
  item: string
  unitPrice: number
  timesPurchased: number
  totalSpent: number
  spentPerMonth: number
  monthlyBreakdown: Record<string, number>
  monthlySpent: Record<string, number>
}
