import { NextResponse } from 'next/server'

const mockData = [
  { item: 'Organic Milk', unitPrice: 4.99, timesPurchased: 24 },
  { item: 'Orange Juice', unitPrice: 3.99, timesPurchased: 18 },
  { item: 'Whole Grain Bread', unitPrice: 3.49, timesPurchased: 52 },
  { item: 'Bananas', unitPrice: 0.59, timesPurchased: 48 },
  { item: 'Eggs (dozen)', unitPrice: 4.29, timesPurchased: 26 },
  { item: 'Greek Yogurt', unitPrice: 5.99, timesPurchased: 36 },
  { item: 'Ground Coffee', unitPrice: 8.99, timesPurchased: 12 },
  { item: 'Chicken Breast', unitPrice: 6.99, timesPurchased: 24 },
  { item: 'Spinach', unitPrice: 2.99, timesPurchased: 30 },
  { item: 'Pasta', unitPrice: 1.99, timesPurchased: 20 }
].map(item => ({
  ...item,
  totalSpent: item.unitPrice * item.timesPurchased
})).sort((a, b) => b.totalSpent - a.totalSpent)

export async function GET() {
  return NextResponse.json(mockData)
}
