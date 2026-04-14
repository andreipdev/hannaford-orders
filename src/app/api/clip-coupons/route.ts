import { NextResponse } from 'next/server';

export async function POST() {
  // Coupon clipping has not been ported to the new Hannaford UI.
  return NextResponse.json(
    { success: false, error: 'clipCoupons not implemented for the new Hannaford UI' },
    { status: 501 }
  );
}
