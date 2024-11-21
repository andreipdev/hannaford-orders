import puppeteer from 'puppeteer';
import { CacheService } from './cacheService';
import { categoryMappings } from '../config/categories';
import { findDefaultPrice } from '../config/defaultPrices';

interface HannafordCredentials {
  username: string;
  password: string;
}

interface ScraperMetadata {
  lastFetchTimestamp: number;
  yearCaches: { [year: string]: string[] };  // year -> array of date keys
}

interface PurchaseData {
  item: string;
  unitPrice: number;
  quantity: number;
  date: Date;
}

export class HannafordScraper {
  private browser: any;
  private page: any;
  private abortSignal: AbortSignal | undefined;
  private cache: CacheService;
  private readonly metadataFilePath: string = '.cache/scraper_metadata.json';
  private processedUrls: Set<string>;
  private static readonly METADATA_KEY = 'scraper_metadata';

  constructor(signal?: AbortSignal) {
    this.abortSignal = signal;
    this.cache = new CacheService();
    // Ensure .cache directory exists
    if (!require('fs').existsSync('.cache')) {
      require('fs').mkdirSync('.cache', { recursive: true });
    }
    this.processedUrls = new Set();

    // Ensure cleanup on process termination
    process.on('exit', this.cleanup.bind(this));
    process.on('SIGINT', this.cleanup.bind(this));
    process.on('SIGTERM', this.cleanup.bind(this));
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught exception:', error);
      await this.cleanup();
      process.exit(1);
    });
  }

  private async cleanup() {
    console.log('Cleaning up Puppeteer resources...');
    if (this.page) {
      try {
        await this.page.close();
      } catch (error) {
        console.error('Error closing page:', error);
      }
      this.page = null;
    }
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Error closing browser:', error);
      }
      this.browser = null;
    }
  }

  async initialize() {
    try {
      // Check if already aborted
      if (this.abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }
      this.browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--disable-http2',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ]
      });
      this.page = await this.browser.newPage();
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async login(credentials: HannafordCredentials) {
    try {
      // Check if we need to refresh data before logging in
      if (!this.shouldRefreshData()) {
        console.log('Using cached data - skipping login');
        return;
      }

      console.log('Navigating to login page: https://www.hannaford.com/login');
      await this.page.goto('https://www.hannaford.com/login', {
        waitUntil: 'networkidle0',
        timeout: 120000
      });

      // Wait for page load
      await this.page.waitForTimeout(5000);

      // Wait for login form
      try {
        await this.page.waitForSelector('#userName', { timeout: 30000 });
      } catch (error) {
        throw new Error('Login form not found - check page structure');
      }

      // Find the username and password fields
      const usernameSelector = await this.page.waitForSelector('#userName');
      const passwordSelector = await this.page.waitForSelector('#passwordField6');

      // Type credentials
      await usernameSelector.type(credentials.username);
      await passwordSelector.type(credentials.password);

      try {

        await Promise.all([
          // Start waiting for navigation before triggering the login
          this.page.waitForNavigation({
            waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
            timeout: 60000
          }).catch(error => {
            console.error('Navigation error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
            throw error;
          }),

          // Trigger the login
          this.page.evaluate(() => {
            // Call the login function with the correct form and index
            if (typeof registerUserLoyalty === 'function') {
              const form = document.forms['registerUserLoyaltyForm6'];
              if (!form) {
                throw new Error('Login form not found');
              }
              registerUserLoyalty(form, 6);
            } else {
              throw new Error('registerUserLoyalty function not found');
            }
          })
        ]);

      } catch (error) {
        throw error;
      }

      // Verify login was successful
      try {
        await Promise.race([
          this.page.waitForSelector('.account-nav', { timeout: 20000 }),
          this.page.waitForSelector('.my-account', { timeout: 20000 }),
          this.page.waitForSelector('[data-testid="account-menu"]', { timeout: 20000 })
        ]);
      } catch (error) {
        throw new Error('Login failed - could not verify successful login');
      }
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async scrapeOrders(): Promise<PurchaseData[]> {
    try {
      const checkAborted = () => {
        if (this.abortSignal?.aborted) {
          throw new Error('Operation cancelled');
        }
      };

      const currentYear = new Date().getFullYear().toString();
      const purchases: PurchaseData[] = [];

      // If we have recent data, use cached data only
      if (!this.shouldRefreshData()) {
        console.log('Using cached data from last 24 hours...');
        const cachedDates = this.getCachedDatesForYear(currentYear);

        for (const dateKey of cachedDates) {
          const orderItems = this.cache.get(dateKey);
          if (orderItems) {
            orderItems.forEach(itemData => {
              if (itemData) {
                purchases.push({
                  item: itemData.name,
                  unitPrice: itemData.price,
                  quantity: itemData.quantity,
                  date: new Date(dateKey)
                });
              }
            });
          }
        }
        return purchases;
      }

      // If we need fresh data, proceed with scraping
      console.log('Cache expired or not found, fetching fresh data...');
      if (this.abortSignal?.aborted) {
        throw new Error('Operation cancelled');
      }

      console.log('Navigating to orders page: https://www.hannaford.com/account/my-orders/in-store');
      await this.page.goto('https://www.hannaford.com/account/my-orders/in-store', {
        waitUntil: 'networkidle0',
        timeout: 120000
      });
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      // First, collect all order URLs and dates
      const ordersList: { url: string; date: Date }[] = [];
      let continueLoading = true;

      while (continueLoading) {
        checkAborted();

        console.log('Waiting for orders table to load...');
        try {
          await this.page.waitForSelector('.store-purchase-table', { timeout: 30000 });
        } catch (error) {
          console.error('Failed to find orders table. Current URL:', await this.page.url());
          throw new Error('Could not find orders table - check page structure');
        }

        // Get all order rows on current page
        let newOrders = await this.page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('.store-purchase-table tbody tr:not(:last-child)'));

          return rows.map(row => ({
            date: row.querySelector('.store-date')?.textContent?.trim() || '',
            url: row.querySelector('.view-details-link')?.getAttribute('href') || ''
          }));
        });

        // filter out rows with no date
        newOrders = newOrders.filter(order => order.date);

        // Process the collected orders
        for (const order of newOrders) {
          const orderDate = new Date(order.date);
          if (orderDate < oneYearAgo) {
            continueLoading = false;
            break;
          }

          if (order.url) {
            const fullUrl = new URL(order.url, 'https://www.hannaford.com').href;
            if (!this.processedUrls.has(fullUrl)) {
              ordersList.push({
                url: fullUrl,
                date: orderDate
              });
            }
          } else {
            console.log(`No "View Details" link found for order dated ${orderDate.toISOString()}`);
            continueLoading = false;
            break;
          }
        }

        if (continueLoading) {
          const seeMoreButton = await this.page.$('#see-more-btn');
          if (seeMoreButton) {
            console.log('Found "See More" button, clicking it...');
            // Get current number of rows
            const currentRowCount = await this.page.evaluate(() =>
              document.querySelectorAll('.store-purchase-table tbody tr:not(:last-child)').length
            );

            await seeMoreButton.click();

            // Wait for row count to increase
            await this.page.waitForFunction(
              (previousCount) => {
                const rows = document.querySelectorAll('.store-purchase-table tbody tr:not(:last-child)');
                return rows.length > previousCount;
              },
              { timeout: 30000 },
              currentRowCount
            );

            // Small delay to ensure content is stable
            await this.page.waitForTimeout(1000);
          } else {
            console.log('No more "See More" button found, finishing collection...');
            continueLoading = false;
          }
        }
      }

      console.log(`Collected ${ordersList.length} orders to process`);

      // Now process each order
      for (const order of ordersList) {
        checkAborted();

        // Check cache first
        const orderDateKey = order.date.toISOString().split('T')[0];
        let orderItems = this.cache.get(orderDateKey);

        if (!orderItems) {
          // Navigate to order details page
          const detailsPage = await this.browser.newPage();
          console.log(`Navigating to order details: ${order.url}`);
          await detailsPage.goto(order.url, {
            timeout: 120000
          });

          // Wait for the items to load
          await detailsPage.waitForSelector('.item-wrapper', { timeout: 30000 });

          // Extract items from the order
          const items = await detailsPage.$$('.item-wrapper');

          // Process items and store in cache
          orderItems = await Promise.all(items.map(item => item.evaluate((el: Element) => {
            const nameEl = el.querySelector('.productName');
            const qtyEl = el.querySelector('.qty');
            const priceEl = el.querySelector('.item-price');

            if (!nameEl || !qtyEl || !priceEl) return null;

            return {
              name: nameEl.textContent?.trim() || '',
              price: parseFloat(priceEl.getAttribute('value') || '0'),
              quantity: parseInt(qtyEl.textContent?.trim() || '0')
            };
          })));

          const orderDateKey = order.date.toISOString().split('T')[0];
          this.cache.set(orderDateKey, orderItems);
          this.addDateToYearCache(orderDateKey);

          // Close the details page
          await detailsPage.close();
        } else {
          console.log(`Using cached data for order date: ${orderDateKey}`);
        }

        // Mark URL as processed
        this.processedUrls.add(order.url);

        // Process the items
        orderItems.forEach(itemData => {
          if (itemData) {
            console.log(`  - ${itemData.name}: ${itemData.quantity} @ $${itemData.price}`);
            purchases.push({
              item: itemData.name,
              unitPrice: itemData.price,
              quantity: itemData.quantity,
              date: order.date
            });
          }
        });
      }

      // Update last fetch timestamp
      const metadata = this.getMetadata();
      metadata.lastFetchTimestamp = Date.now();
      this.saveMetadata(metadata);

      return purchases;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  private getMetadata(): ScraperMetadata {
    try {
      if (require('fs').existsSync(this.metadataFilePath)) {
        const data = require('fs').readFileSync(this.metadataFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Error reading metadata file:', error);
    }
    return {
      lastFetchTimestamp: 0,
      yearCaches: {}
    };
  }

  private saveMetadata(metadata: ScraperMetadata) {
    try {
      require('fs').writeFileSync(
        this.metadataFilePath,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving metadata file:', error);
    }
  }

  private shouldRefreshData(): boolean {
    const metadata = this.getMetadata();
    const now = Date.now();
    const hoursSinceLastFetch = (now - metadata.lastFetchTimestamp) / (1000 * 60 * 60);
    return hoursSinceLastFetch >= 24;
  }

  private addDateToYearCache(date: string) {
    const year = date.split('-')[0];
    const metadata = this.getMetadata();

    if (!metadata.yearCaches[year]) {
      metadata.yearCaches[year] = [];
    }

    if (!metadata.yearCaches[year].includes(date)) {
      metadata.yearCaches[year].push(date);
      this.saveMetadata(metadata);
    }
  }

  private getCachedDatesForYear(year: string): string[] {
    const metadata = this.getMetadata();
    return metadata.yearCaches[year] || [];
  }

  async close() {
    await this.cleanup();
  }

  processOrderData(purchases: PurchaseData[]) {
    // Helper function to get category name
    const getCategoryName = (itemName: string): string => {
      for (const [category, pattern] of Object.entries(categoryMappings)) {
        if (pattern.test(itemName)) {
          return category;
        }
      }
      return itemName; // Default category if no match found
    };

    // Track price ranges for categories
    const priceRanges = new Map<string, { min: number; max: number }>();

    // First pass to find minimum prices and apply default prices
    purchases.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);

      // Apply default price if price is 0
      if (purchase.unitPrice === 0) {
        const defaultPrice = findDefaultPrice(purchase.item);
        if (defaultPrice !== null) {
          purchase.unitPrice = defaultPrice;
        } else {
          console.warn(`No default price found for item: ${purchase.item}`);
        }
      }

      if (purchase.unitPrice > 0) {  // Only consider non-zero prices
        const current = priceRanges.get(categoryName) ?? { min: Infinity, max: -Infinity };
        priceRanges.set(categoryName, {
          min: Math.min(current.min, purchase.unitPrice),
          max: Math.max(current.max, purchase.unitPrice)
        });
      }
    });

    // Group purchases by item and calculate monthly breakdowns
    const itemMap = new Map();

    // First pass: Initialize items and track monthly quantities
    purchases.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);
      const month = purchase.date.toLocaleString('default', { month: 'long' });
      const key = categoryName;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: categoryName,
          unitPrice: purchase.unitPrice || (priceRanges.get(categoryName)?.min || 0),
          priceRange: priceRanges.get(categoryName) || { min: 0, max: 0 },
          timesPurchased: 0,
          monthlyBreakdown: {},
          monthlySpent: {},
          totalSpent: 0,
          includedItems: new Set<string>()
        });
      }

      const itemData = itemMap.get(key);
      itemData.timesPurchased += purchase.quantity;

      // Track both quantity and actual spending per month
      if (!itemData.monthlyBreakdown[month]) {
        itemData.monthlyBreakdown[month] = 0;
        itemData.monthlySpent[month] = 0;
      }
      itemData.monthlyBreakdown[month] += purchase.quantity;
      itemData.monthlySpent[month] += purchase.unitPrice * purchase.quantity;
      itemData.totalSpent += purchase.unitPrice * purchase.quantity;
      itemData.includedItems.add(purchase.item);
    });

    // Calculate average spent per month for each item
    for (const itemData of itemMap.values()) {
      const totalMonthlySpent = Object.values(itemData.monthlySpent).reduce((sum: number, spent: number) => sum + spent, 0);
      const numberOfMonths = Object.keys(itemData.monthlySpent).length;
      itemData.spentPerMonth = numberOfMonths > 0 ? totalMonthlySpent / numberOfMonths : 0;
    }

    // Convert to array and sort by spent per month (descending)
    return Array.from(itemMap.values())
      .map(item => ({
        ...item,
        includedItems: Array.from(item.includedItems).sort()
      }))
      .sort((a, b) => b.spentPerMonth - a.spentPerMonth);
  }
}
