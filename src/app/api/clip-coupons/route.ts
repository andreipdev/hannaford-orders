import { NextResponse } from 'next/server';
import { HannafordScraper } from '../../../services/hannafordScraper';

export async function POST() {
  try {
    const scraper = new HannafordScraper();
    await scraper.initialize();

    const username = process.env.HANNAFORD_USERNAME;
    const password = process.env.HANNAFORD_PASSWORD;

    if (!username || !password) {
      throw new Error('Missing Hannaford credentials');
    }

    await scraper.login({ username, password });
    await scraper.clipCoupons();
    await scraper.close();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in /api/clip-coupons:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
