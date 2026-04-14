import { NextResponse } from 'next/server';
import { HannafordScraper } from '../../../services/hannafordScraper';

export async function GET(request: Request) {
  const username = process.env.HANNAFORD_USERNAME;
  const password = process.env.HANNAFORD_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Missing HANNAFORD_USERNAME / HANNAFORD_PASSWORD in .env.local' },
      { status: 400 }
    );
  }

  const scraper = new HannafordScraper(request.signal);
  try {
    await scraper.initialize();
    await scraper.login({ username, password });
    const purchases = await scraper.scrapeOrders();
    return NextResponse.json(scraper.processOrderData(purchases));
  } catch (error) {
    console.error('Error fetching Hannaford data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  } finally {
    await scraper.close();
  }
}
