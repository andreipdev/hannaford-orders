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
    await this.page.goto('https://www.hannaford.com/login', {
      waitUntil: 'networkidle0',
      timeout: 60000
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
    await this.page.goto('https://www.hannaford.com/account/my-orders/in-store', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    const purchases: PurchaseData[] = [];
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    let hasMoreOrders = true;

    while (hasMoreOrders) {
      checkAborted(); // Check for cancellation before each iteration
      // Wait for orders table to load
      console.log('Waiting for orders to load...');
      try {
        await this.page.waitForSelector('.store-purchase-table', { timeout: 30000 });
      } catch (error) {
        console.error('Failed to find orders table. Current URL:', await this.page.url());
        const content = await this.page.content();
        console.log('Page content:', content);
        throw new Error('Could not find orders table - check page structure');
      }

      // Get all order rows on current page
      const orders = await this.page.$$('.store-purchase-table tbody tr:not(:last-child)');
      console.log(`Found ${orders.length} orders on current page`);

      for (const order of orders) {
        // Get order date and details URL
        const [dateText, detailsUrl] = await order.evaluate((row: Element) => {
          const dateCell = row.querySelector('.store-date');
          const detailsLink = row.querySelector('.view-details-link');
          return [
            dateCell?.textContent?.trim() || '',
            detailsLink?.getAttribute('href') || ''
          ];
        });

        const orderDate = new Date(dateText);
        console.log(`Processing order from ${orderDate.toLocaleDateString()}`);

        // Stop if order is older than a year
        if (orderDate < oneYearAgo) {
          hasMoreOrders = false;
          break;
        }

        // Construct full URL for order details
        const orderDetailsUrl = new URL(detailsUrl, 'https://www.hannaford.com').href;

        // Check if we've already processed this URL
        if (this.processedUrls.has(orderDetailsUrl)) {
          console.log(`Skipping already processed order: ${orderDetailsUrl}`);
          continue;
        }

        // Check cache first
        let orderItems = this.cache.get(orderDetailsUrl);
        
        if (!orderItems) {
          // Navigate to order details page
          const detailsPage = await this.browser.newPage();
          await detailsPage.goto(orderDetailsUrl);

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
          this.cache.set(orderDetailsUrl, orderItems);
          
          // Close the details page
          await detailsPage.close();
        } else {
          console.log(`Using cached data for order: ${orderDetailsUrl}`);
        }

        // Mark URL as processed
        this.processedUrls.add(orderDetailsUrl);

        // Process the items
        orderItems.forEach(itemData => {
          if (itemData) {
            console.log(`  - ${itemData.name}: ${itemData.quantity} @ $${itemData.price}`);
            purchases.push({
              item: itemData.name,
              unitPrice: itemData.price,
              quantity: itemData.quantity,
              date: orderDate
            });
          }
        });
      }

      // Check if there are more orders to load
      const hasMoreOrdersToFetch = await this.page.evaluate(() => {
        const paginationData = window.ordersPaginationEventData;
        return paginationData && paginationData.displaySeeMoreButton;
      });

      if (hasMoreOrdersToFetch && hasMoreOrders) {
        console.log('Loading more orders...');
        try {
          // Get the current index for the next page
          const currentIndex = await this.page.evaluate(() => {
            return window.ordersPaginationEventData?.nextIndex || 0;
          });

          // Make the AJAX request directly
          const response = await this.page.evaluate(async (index) => {
            const response = await fetch('/account/my-orders/in-store', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: `ajaxRefresh=true&currentIndex=${index}`
            });
            return response.text();
          }, currentIndex);

          // Update the page content
          await this.page.evaluate((htmlContent) => {
            // Create a temporary container and insert the HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;

            // Update the order history wrapper
            const existingWrapper = document.getElementById('orderHistoryWrapper');
            const newWrapper = tempDiv.querySelector('#orderHistoryWrapper');
            if (existingWrapper && newWrapper) {
              existingWrapper.innerHTML = newWrapper.innerHTML;
            }

            // Find and evaluate any pagination scripts
            const scripts = tempDiv.querySelectorAll('script:not([src])');
            scripts.forEach(script => {
              if (script.textContent?.includes('ordersPaginationEventData')) {
                eval(script.textContent);
              }
            });
          }, response);

          await this.page.waitForTimeout(1000); // Short wait for DOM update
        } catch (error) {
          console.error('Failed to load more orders:', error);
          hasMoreOrders = false;
        }
      } else {
        hasMoreOrders = false;
      }
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
