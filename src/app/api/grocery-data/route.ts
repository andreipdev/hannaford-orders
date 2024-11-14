import { NextResponse } from 'next/server'

const mockData = [
  { month: 'January', averageCost: 425.50 },
  { month: 'February', averageCost: 389.75 },
  { month: 'March', averageCost: 401.25 },
  { month: 'April', averageCost: 445.00 },
  { month: 'May', averageCost: 412.80 },
]

export async function GET() {
  return NextResponse.json(mockData)
}
