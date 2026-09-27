import { NextResponse } from 'next/server';
import { HannafordScraper } from '../../../services/hannafordScraper';
import { isLocalRequest } from '../../../lib/local-request';

export async function GET(request: Request) {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ error: 'Local same-origin access only.' }, { status: 403 });
  }
  const username = process.env.HANNAFORD_USERNAME;
  const password = process.env.HANNAFORD_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { error: 'Missing credentials. Start with npm run start:hannaford.' },
      { status: 400 }
    );
  }

  const scraper = new HannafordScraper(request.signal);
  try {
    await scraper.initialize();
    await scraper.login({ username, password });
    const purchases = await scraper.scrapeOrders();
    return NextResponse.json(scraper.processOrderData(purchases), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Error fetching Hannaford data:', error);
    return NextResponse.json(
      { error: 'Could not fetch grocery data. Check the local terminal for details.' },
      { status: 500 }
    );
  } finally {
    await scraper.close();
  }
}
