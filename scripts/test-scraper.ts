// Run the scraper from the CLI so we can test outside Next.js.
//   DISPLAY=:0 npx tsx scripts/test-scraper.ts
import { config } from 'dotenv';
import { HannafordScraper } from '../src/services/hannafordScraper';

config({ path: '.env.local' });

(async () => {
  const username = process.env.HANNAFORD_USERNAME;
  const password = process.env.HANNAFORD_PASSWORD;
  if (!username || !password) {
    console.error('Missing HANNAFORD_USERNAME / HANNAFORD_PASSWORD in .env.local');
    process.exit(1);
  }

  const scraper = new HannafordScraper();
  try {
    await scraper.initialize();
    await scraper.login({ username, password });
    const purchases = await scraper.scrapeOrders();
    const processed = scraper.processOrderData(purchases);
    console.log(`\nScraped ${purchases.length} purchase rows → ${processed.length} grouped items`);
    console.log('top 5:', processed.slice(0, 5).map(p => ({
      item: p.item,
      spentPerMonth: p.spentPerMonth.toFixed(2),
    })));
  } finally {
    await scraper.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
