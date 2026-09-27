import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { CacheService } from './cacheService';
import { processOrderData, type PurchaseData } from './orderData';

interface HannafordCredentials {
  username: string;
  password: string;
}

interface ScraperMetadata {
  lastFetchTimestamp: number;
  yearCaches: { [year: string]: string[] };
}

const ORDERS_URL = 'https://www.hannaford.com/account/history/invoice/in-store';

export class HannafordScraper {
  private browser: any;
  private page: any;
  private abortSignal: AbortSignal | undefined;
  private cache: CacheService;
  private readonly metadataFilePath = '.cache/scraper_metadata.json';
  private readonly profileDir = path.join(process.cwd(), '.chrome-profile');

  constructor(signal?: AbortSignal) {
    this.abortSignal = signal;
    this.cache = new CacheService();
    if (!fs.existsSync('.cache')) fs.mkdirSync('.cache', { recursive: true });
  }

  private log(...args: any[]) {
    console.log('[hannaford]', ...args);
  }

  private async cleanup() {
    if (this.page) {
      try { await this.page.close(); } catch {}
      this.page = null;
    }
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
    }
  }

  private checkAborted() {
    if (this.abortSignal?.aborted) throw new Error('Operation cancelled');
  }

  async initialize() {
    this.checkAborted();
    // Hannaford is behind DataDome — headless is almost always flagged.
    // Default to headful; set HANNAFORD_HEADLESS=1 to override once cookies are warm.
    const headless = process.env.HANNAFORD_HEADLESS === '1';
    this.browser = await puppeteer.launch({
      headless,
      userDataDir: this.profileDir,
      args: [
        '--window-size=1400,1000',
      ],
    });
    const pages = await this.browser.pages();
    this.page = pages[0] || (await this.browser.newPage());
    await this.page.setViewport({ width: 1400, height: 1000 });
  }

  // Wait until the page is past any DataDome / "Security Block" interstitial.
  private async waitForNotBlocked(maxSeconds = 300): Promise<boolean> {
    for (let i = 0; i < maxSeconds; i++) {
      this.checkAborted();
      const title = await this.page.title().catch(() => '');
      const blocked = /^hannaford\.com$/i.test(title)
        || /security block|verification required|just a moment/i.test(title);
      if (!blocked) return true;
      if (i === 0) this.log('DataDome interstitial detected — solve the captcha in the Chrome window.');
      if (i % 10 === 0 && i > 0) this.log(`still waiting for captcha… ${i}s`);
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  async login(credentials: HannafordCredentials) {
    if (!this.shouldRefreshData()) {
      this.log('using cached data — skipping login');
      return;
    }

    this.log('navigating to orders page');
    await this.page.goto(ORDERS_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    const cleared = await this.waitForNotBlocked();
    if (!cleared) throw new Error('timed out waiting for DataDome interstitial');

    // Give the SPA a moment to decide whether to pop the login modal.
    await new Promise(r => setTimeout(r, 4000));

    const loginModal = await this.page.$('#login-username');
    if (!loginModal) {
      this.log('no login modal — session appears valid');
      return;
    }

    this.log('login modal present; filling credentials');
    await this.page.type('#login-username', credentials.username, { delay: 40 });
    await this.page.type('#current-password', credentials.password, { delay: 40 });
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      this.page.click('#sign-in-button'),
    ]);
    await new Promise(r => setTimeout(r, 5000));

    // OTP / "Verify with a secure code" step — user must complete it manually.
    const hasOtpPrompt = async () => this.page.evaluate(() => {
      const text = document.body?.innerText || '';
      return /verify\s+with\s+a\s+secure\s+code|enter\s+your\s+code|send\s+code/i.test(text);
    }).catch(() => false);

    if (await hasOtpPrompt()) {
      this.log('SMS/email verification required — complete it in the Chrome window.');
      for (let i = 0; i < 600; i++) {
        this.checkAborted();
        await new Promise(r => setTimeout(r, 1000));
        if (!(await hasOtpPrompt())) { this.log(`OTP resolved after ${i}s`); break; }
        if (i > 0 && i % 30 === 0) this.log(`still waiting for OTP… ${i}s`);
      }
    }

    await this.waitForNotBlocked();
  }

  async scrapeOrders(): Promise<PurchaseData[]> {
    if (this.shouldRefreshData()) {
      await this.scrapeFreshOrdersIntoCache();
    } else {
      this.log('cache fresh (<24h) — skipping site scrape');
    }

    const purchases: PurchaseData[] = [];
    for (const dateKey of this.getCachedDatesFor12Months()) {
      const items = this.cache.get(dateKey);
      if (!items) continue;
      items.forEach((d: any) => d && purchases.push({
        item: d.name, unitPrice: d.price, quantity: d.quantity, date: new Date(dateKey),
      }));
    }
    return purchases;
  }

  private async scrapeFreshOrdersIntoCache(): Promise<void> {
    this.log('scraping fresh data');
    // Make sure we're on the orders list (login() may have left us elsewhere).
    if (!/history\/invoice\/in-store/.test(this.page.url())) {
      await this.page.goto(ORDERS_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await this.waitForNotBlocked();
    }

    try {
      await this.page.waitForSelector('li[orderid]', { timeout: 30000 });
    } catch {
      throw new Error('orders list did not render — login may have failed');
    }
    await new Promise(r => setTimeout(r, 1500));

    const orders: { orderId: string; date: string }[] = await this.page.$$eval(
      'li[orderid]',
      (lis: any[]) => lis.map(li => ({
        orderId: li.getAttribute('orderid') || '',
        date: li.getAttribute('orderdate') || '',
      }))
    );
    this.log(`found ${orders.length} orders in list`);

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (let i = 0; i < orders.length; i++) {
      this.checkAborted();
      const { orderId, date } = orders[i];
      if (!orderId || !date) continue;

      if (new Date(date) < oneYearAgo) {
        this.log(`stopping at older order ${date}`);
        break;
      }

      if (this.cache.has(date)) {
        this.log(`using cache for ${date}`);
        continue;
      }

      this.log(`(${i + 1}/${orders.length}) scraping order ${orderId} — ${date}`);
      await this.scrapeOrderDetail(orderId, date);
    }

    const metadata = this.getMetadata();
    metadata.lastFetchTimestamp = Date.now();
    this.saveMetadata(metadata);
  }

  // Clicks into an order row, scrapes items, stores them, navigates back.
  private async scrapeOrderDetail(orderId: string, dateKey: string): Promise<void> {
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      this.page.evaluate((id: string) => {
        const li = document.querySelector(`li[orderid="${id}"]`);
        const btn = li?.querySelector('button');
        (btn as HTMLElement | null)?.click();
      }, orderId),
    ]);

    try {
      await this.page.waitForSelector('.order-history-producttile_name', { timeout: 30000 });
    } catch {
      this.log(`no items rendered for order ${orderId}, caching empty`);
    }
    await new Promise(r => setTimeout(r, 1500));

    const items = await this.page.$$eval('.order-history-list_item', (rows: any[]) => rows.map(el => {
      const name = el.querySelector('.order-history-producttile_name')?.textContent?.trim() || '';
      const qtyText = (el.querySelector('#product-pricelabel-quantity')
        || el.querySelector('.order-history-producttile_quantity'))?.textContent?.trim() || '';
      const totalText = el.querySelector('.order-history-producttile_totalcost')?.textContent?.trim() || '';

      // "2 x $2.50 ea." → quantity=2, unitPrice=2.50
      const m = qtyText.match(/(\d+(?:\.\d+)?)\s*x\s*\$?([\d.]+)/i);
      const quantity = m ? parseFloat(m[1]) : 1;
      let price = m ? parseFloat(m[2]) : 0;
      if (!price) {
        const total = parseFloat(totalText.replace(/[^\d.]/g, ''));
        if (!isNaN(total) && quantity) price = total / quantity;
      }
      return name ? { name, price, quantity } : null;
    }));

    this.cache.set(dateKey, items);
    this.addDateToYearCache(dateKey);

    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      this.page.goBack({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    ]);
    try { await this.page.waitForSelector('li[orderid]', { timeout: 15000 }); } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }

  private getMetadata(): ScraperMetadata {
    try {
      if (fs.existsSync(this.metadataFilePath)) {
        return JSON.parse(fs.readFileSync(this.metadataFilePath, 'utf8'));
      }
    } catch (e) {
      console.warn('metadata read error:', e);
    }
    return { lastFetchTimestamp: 0, yearCaches: {} };
  }

  private saveMetadata(metadata: ScraperMetadata) {
    fs.writeFileSync(this.metadataFilePath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  private shouldRefreshData(): boolean {
    const hoursSince = (Date.now() - this.getMetadata().lastFetchTimestamp) / 3600000;
    return hoursSince >= 24;
  }

  private addDateToYearCache(date: string) {
    const year = date.split('-')[0];
    const metadata = this.getMetadata();
    if (!metadata.yearCaches[year]) metadata.yearCaches[year] = [];
    if (!metadata.yearCaches[year].includes(date)) {
      metadata.yearCaches[year].push(date);
      this.saveMetadata(metadata);
    }
  }

  private getCachedDatesFor12Months(): string[] {
    const metadata = this.getMetadata();
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    return Object.values(metadata.yearCaches)
      .flat()
      .filter(d => new Date(d) >= cutoff)
      .sort();
  }

  async close() {
    await this.cleanup();
  }

  async clipCoupons() {
    throw new Error('clipCoupons not implemented for the new Hannaford UI');
  }

  processOrderData(purchases: PurchaseData[]) {
    return processOrderData(purchases);
  }
}
