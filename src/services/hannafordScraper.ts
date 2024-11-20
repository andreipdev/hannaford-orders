import puppeteer from 'puppeteer';
import { CacheService } from './cacheService';

interface HannafordCredentials {
  username: string;
  password: string;
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
  private processedUrls: Set<string>;

  constructor(signal?: AbortSignal) {
    this.abortSignal = signal;
    this.cache = new CacheService();
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
      console.log('Navigating to orders page...');
      console.log('Navigating to orders page: https://www.hannaford.com/account/my-orders/in-store');
      await this.page.goto('https://www.hannaford.com/account/my-orders/in-store', {
        waitUntil: 'networkidle0',
        timeout: 120000
      });

      const purchases: PurchaseData[] = [];
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
        const newOrders = await this.page.evaluate(() => {
          const rows = Array.from(document.querySelectorAll('.store-purchase-table tbody tr:not(:last-child)'));
          return rows.map(row => ({
            date: row.querySelector('.store-date')?.textContent?.trim() || '',
            url: row.querySelector('.view-details-link')?.getAttribute('href') || ''
          }));
        });

        // Process the collected orders
        for (const order of newOrders) {
          const orderDate = new Date(order.date);
          if (orderDate < oneYearAgo) {
            continueLoading = false;
            break;
          }
          
          const fullUrl = new URL(order.url, 'https://www.hannaford.com').href;
          if (!this.processedUrls.has(fullUrl)) {
            ordersList.push({
              url: fullUrl,
              date: orderDate
            });
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
        let orderItems = this.cache.get(order.url);

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

          // Cache the results
          this.cache.set(order.url, orderItems);

          // Close the details page
          await detailsPage.close();
        } else {
          console.log(`Using cached data for order: ${order.url}`);
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

      return purchases;
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  async close() {
    await this.cleanup();
  }

  processOrderData(purchases: PurchaseData[]) {
    // Helper function to get category name - just returns the item name for now
    const getCategoryName = (itemName: string): string => {
      return itemName;
    };

    // Track minimum prices for categories
    const minPrices = new Map<string, number>();

    // First pass to find minimum prices
    purchases.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);
      const currentMin = minPrices.get(categoryName) ?? Infinity;
      minPrices.set(categoryName, Math.min(currentMin, purchase.unitPrice));
    });

    // Group purchases by item and calculate monthly breakdowns
    const itemMap = new Map();

    purchases.forEach(purchase => {
      const categoryName = getCategoryName(purchase.item);
      const month = purchase.date.toLocaleString('default', { month: 'long' });
      const key = categoryName;

      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: categoryName,
          unitPrice: minPrices.get(categoryName) ?? purchase.unitPrice,
          timesPurchased: 0,
          monthlyBreakdown: {},
          totalSpent: 0
        });
      }

      const itemData = itemMap.get(key);
      itemData.timesPurchased += purchase.quantity;
      itemData.monthlyBreakdown[month] = (itemData.monthlyBreakdown[month] || 0) + purchase.quantity;
      itemData.totalSpent += purchase.unitPrice * purchase.quantity;
    });

    // Calculate monthly spent for each item
    for (const itemData of itemMap.values()) {
      itemData.monthlySpent = {};
      Object.entries(itemData.monthlyBreakdown).forEach(([month, quantity]) => {
        itemData.monthlySpent[month] = quantity * itemData.unitPrice;
      });
    }

    return Array.from(itemMap.values());
  }
}
