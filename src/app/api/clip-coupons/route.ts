import { NextResponse } from 'next/server';
import { isLocalRequest } from '../../../lib/local-request';

export async function POST(request: Request) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: 'Local same-origin access only.' }, { status: 403 });
  }
  // Coupon clipping has not been ported to the new Hannaford UI.
  return NextResponse.json(
    { success: false, error: 'clipCoupons not implemented for the new Hannaford UI' },
    { status: 501 }
  );
}
